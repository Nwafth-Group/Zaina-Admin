import React, { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

export default function ServiceActionModal({ serviceToEdit, categories, onClose }) {
    const { t, i18n } = useTranslation('services');
    const queryClient = useQueryClient();
    const isEditMode = !!serviceToEdit;

    // --- 1. جلب قائمة العمال ---
    const { data: workersList, isLoading: isWorkersLoading } = useQuery({
        queryKey: ['workersList'],
        queryFn: async () => {
            const response = await axiosInstance.get('/admin/workers');
            return response.data.data.items || [];
        },
    });

    // --- 2. جلب التفاصيل الكاملة للخدمة في حالة التعديل ---
    const { data: fullServiceData, isLoading: isServiceLoading } = useQuery({
        queryKey: ['serviceDetails', serviceToEdit?.id],
        queryFn: async () => {
            const response = await axiosInstance.get(`/admin/services/${serviceToEdit.id}`);
            return response.data.data;
        },
        enabled: isEditMode, // تشتغل فقط إذا كنا في وضع التعديل
    });

    // --- 3. إعداد الـ Validation Schema ---
    const schema = yup.object().shape({
        category_id: yup.string().required(t('validation.required')),
        type: yup.string().required(t('validation.required')),
        name_ar: yup.string().required(t('validation.required')),
        name_en: yup.string().required(t('validation.required')),
        status: yup.string().required(t('validation.required')),
        
        min_duration_hours: yup.number().transform(value => (isNaN(value) ? undefined : value)).when('type', {
            is: (val) => val === 'hourly' || val === 'both',
            then: (s) => s.required(t('validation.required')).min(1, t('validation.min_1')),
            otherwise: (s) => s.nullable()
        }),
        allowed_durations: yup.string().when('type', {
            is: (val) => val === 'hourly' || val === 'both',
            then: (s) => s.required(t('validation.required')),
            otherwise: (s) => s.nullable()
        }),
        
        min_contract_months: yup.number().transform(value => (isNaN(value) ? undefined : value)).when('type', {
            is: (val) => val === 'moqema' || val === 'both',
            then: (s) => s.required(t('validation.required')).min(1, t('validation.min_1')),
            otherwise: (s) => s.nullable()
        }),
        
        base_price: yup.number().transform(value => (isNaN(value) ? undefined : value)).required(t('validation.required')).min(0, t('validation.min_0')),
        price_per_hour: yup.number().transform(value => (isNaN(value) ? undefined : value)).required(t('validation.required')).min(0, t('validation.min_0')),
        workers: yup.array().of(yup.string()).min(1, t('validation.required')),
    });

    const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            status: 'active', type: 'hourly', pricing_scope: 'area', cancel_action: 'fee', cancel_fee_type: 'fixed', no_show_policy: 'consumed',
            workers: []
        }
    });

    const watchType = watch('type');

    // --- 4. تعبئة البيانات عند اكتمال جلب التفاصيل ---
    useEffect(() => {
        if (isEditMode && fullServiceData) {
            reset({
                category_id: String(fullServiceData.category?.id || ''),
                type: fullServiceData.type || 'hourly',
                name_ar: fullServiceData.name_ar || '',
                name_en: fullServiceData.name_en || '',
                description_ar: fullServiceData.description_ar || '',
                description_en: fullServiceData.description_en || '',
                status: fullServiceData.status || 'active',
                
                // Durations
                min_duration_hours: fullServiceData.duration?.min_duration_hours || '',
                allowed_durations: fullServiceData.duration?.allowed_durations?.join(', ') || '',
                min_contract_months: fullServiceData.duration?.min_contract_months || '',
                allowed_contract_durations: fullServiceData.duration?.allowed_contract_durations?.join(', ') || '',

                // Rules
                free_cancel_cutoff_hours: fullServiceData.rules?.free_cancel_cutoff_hours ?? '',
                reschedule_cutoff_hours: fullServiceData.rules?.reschedule_cutoff_hours ?? '',
                lead_time_min_hours: fullServiceData.rules?.lead_time_min_hours ?? '',
                lead_time_max_days: fullServiceData.rules?.lead_time_max_days ?? '',
                cancel_action: fullServiceData.rules?.late_cancel_action || 'fee',
                cancel_fee_type: fullServiceData.rules?.late_cancel_fee_type || 'fixed',
                cancel_fee_value: fullServiceData.rules?.late_cancel_fee_value || '',
                no_show_policy: fullServiceData.rules?.no_show_policy || 'consumed',
                max_changes_per_booking: fullServiceData.rules?.max_changes_per_booking ?? '',

                // Prices (بناءً على الـ Response الجديد price_details)
                pricing_scope: 'area', // افتراضي إذا لم يرجع من الـ API
                base_price: fullServiceData.price_details?.base_price || '',
                price_per_hour: fullServiceData.price_details?.price_per_hour || '',
                currency: fullServiceData.price_details?.currency || 'EGP',

                // Features
                feature_ar: fullServiceData.features?.[0]?.ar || '',
                feature_en: fullServiceData.features?.[0]?.en || '',

                // Workers
                workers: fullServiceData.workers?.map(w => String(w.id)) || [],
            });
        }
    }, [fullServiceData, isEditMode, reset]);

    // --- 5. تجهيز وإرسال الطلب ---
    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const payload = new FormData();
            if (isEditMode) payload.append('_method', 'PUT'); 

            // البيانات الأساسية
            payload.append('category_id', data.category_id);
            payload.append('type', data.type);
            payload.append('name_ar', data.name_ar);
            payload.append('name_en', data.name_en);
            if (data.description_ar) payload.append('description_ar', data.description_ar);
            if (data.description_en) payload.append('description_en', data.description_en);
            payload.append('status', data.status);
            if (data.image && data.image[0]) payload.append('image', data.image[0]);

            // المدد
            if (data.type === 'hourly' || data.type === 'both') {
                payload.append('durations[min_duration_hours]', data.min_duration_hours);
                data.allowed_durations.split(',').forEach(d => {
                    if(d.trim()) payload.append('durations[allowed_durations][]', d.trim());
                });
            }
            if (data.type === 'moqema' || data.type === 'both') {
                payload.append('durations[min_contract_months]', data.min_contract_months);
                data.allowed_contract_durations?.split(',').forEach(d => {
                    if(d.trim()) payload.append('durations[allowed_contract_durations][]', d.trim());
                });
            }

            // القواعد
            const appendRule = (key, val) => { if (val !== '' && val !== undefined && val !== null) payload.append(`rules[${key}]`, val); };
            appendRule('free_cancel_cutoff_hours', data.free_cancel_cutoff_hours);
            appendRule('reschedule_cutoff_hours', data.reschedule_cutoff_hours);
            appendRule('lead_time_min_hours', data.lead_time_min_hours);
            appendRule('lead_time_max_days', data.lead_time_max_days);
            appendRule('late_cancel_action', data.cancel_action);
            appendRule('late_cancel_fee_type', data.cancel_fee_type);
            appendRule('late_cancel_fee_value', data.cancel_fee_value);
            appendRule('no_show_policy', data.no_show_policy);
            appendRule('max_changes_per_booking', data.max_changes_per_booking);

            // التسعير
            payload.append('prices[0][pricing_scope]', data.pricing_scope);
            payload.append('prices[0][city_id]', 1); // ثابت مؤقتاً
            payload.append('prices[0][area_id]', 1);
            payload.append('prices[0][base_price]', data.base_price);
            payload.append('prices[0][price_per_hour]', data.price_per_hour);
            payload.append('prices[0][currency]', data.currency || 'EGP');

            // التغطية
            payload.append('coverages[0][city_id]', 1); // ثابت مؤقتاً
            payload.append('coverages[0][area_id]', 1);
            payload.append('coverages[0][status]', 'active');

            // الميزات
            if (data.feature_ar || data.feature_en) {
                if (data.feature_en) payload.append('features[0][en]', data.feature_en);
                if (data.feature_ar) payload.append('features[0][ar]', data.feature_ar);
            }

            // العمال
            if (data.workers && data.workers.length > 0) {
                data.workers.forEach(workerId => payload.append('workers[]', workerId));
            }

            const url = isEditMode ? `/admin/services/${serviceToEdit.id}` : '/admin/services';
            return axiosInstance.post(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || "تمت العملية بنجاح");
            queryClient.invalidateQueries({ queryKey: ['services'] });
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "حدث خطأ أثناء حفظ البيانات.");
        }
    });

    const onSubmit = (data) => submitMutation.mutate(data);
    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 font-main">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden relative max-h-[95vh] flex flex-col">
                
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-800">{isEditMode ? t('form.title_edit') : t('form.title_add')}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto p-4 md:p-6 bg-[#F8F9FA]">
                    {isEditMode && isServiceLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="flex flex-col items-center gap-3 text-[#E91E63]">
                                <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                <span className="font-medium text-gray-600">جاري تحميل بيانات الخدمة...</span>
                            </div>
                        </div>
                    ) : (
                        <form id="service-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            
                            {/* 1. Basic Info */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                                <h4 className="font-bold text-[#E91E63] border-b pb-2">{t('form.section_basic')}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-sm mb-1">{t('form.name_ar')}</label><input {...register('name_ar')} className={`w-full px-4 py-2 border rounded-lg outline-none ${errors.name_ar?'border-red-500':'border-gray-200 focus:border-[#E91E63]'}`} /><ErrorMsg name="name_ar"/></div>
                                    <div><label className="block text-sm mb-1">{t('form.name_en')}</label><input {...register('name_en')} className={`w-full px-4 py-2 border rounded-lg outline-none ${errors.name_en?'border-red-500':'border-gray-200 focus:border-[#E91E63]'}`} /><ErrorMsg name="name_en"/></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm mb-1">{t('form.category')}</label>
                                        <select {...register('category_id')} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none bg-white focus:border-[#E91E63]">
                                            <option value="">-- اختر --</option>
                                            {categories.map(cat => <option key={cat.id} value={cat.id}>{i18n.language === 'ar' ? cat.name_ar : cat.name_en}</option>)}
                                        </select>
                                        <ErrorMsg name="category_id"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">{t('form.type')}</label>
                                        <select {...register('type')} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none bg-white focus:border-[#E91E63]">
                                            <option value="hourly">Hourly (بالساعة)</option>
                                            <option value="moqema">Moqema (إقامة)</option>
                                            <option value="both">Both (الكل)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">{t('form.status')}</label>
                                        <select {...register('status')} className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none bg-white focus:border-[#E91E63]">
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="draft">Draft</option>
                                            <option value="hidden">Hidden</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-sm mb-1">{t('form.desc_ar')}</label><textarea {...register('description_ar')} rows="2" className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none"></textarea></div>
                                    <div><label className="block text-sm mb-1">{t('form.desc_en')}</label><textarea {...register('description_en')} rows="2" className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none"></textarea></div>
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">{t('form.image')}</label>
                                    {isEditMode && fullServiceData?.image && <img src={fullServiceData.image} alt="current" className="h-12 rounded mb-2 border"/>}
                                    <input type="file" accept="image/*" {...register('image')} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#FDF0F3] file:text-[#E91E63]" />
                                </div>
                            </div>

                            {/* 2. Durations */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                                <h4 className="font-bold text-[#E91E63] border-b pb-2">{t('form.section_duration')}</h4>
                                {(watchType === 'hourly' || watchType === 'both') && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                        <div><label className="block text-sm mb-1">{t('form.min_duration')}</label><input type="number" {...register('min_duration_hours')} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" /><ErrorMsg name="min_duration_hours"/></div>
                                        <div><label className="block text-sm mb-1">{t('form.allowed_durations')}</label><input type="text" {...register('allowed_durations')} dir="ltr" placeholder="2, 4, 6" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-left" /><ErrorMsg name="allowed_durations"/></div>
                                    </div>
                                )}
                                {(watchType === 'moqema' || watchType === 'both') && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-purple-50/50 p-3 rounded-lg border border-purple-100 mt-2">
                                        <div><label className="block text-sm mb-1">{t('form.min_contract')}</label><input type="number" {...register('min_contract_months')} className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none" /><ErrorMsg name="min_contract_months"/></div>
                                        <div><label className="block text-sm mb-1">{t('form.allowed_contracts')}</label><input type="text" {...register('allowed_contract_durations')} dir="ltr" placeholder="1, 3, 6" className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-left" /></div>
                                    </div>
                                )}
                            </div>

                            {/* 3. Pricing, Features & Workers */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                                <h4 className="font-bold text-[#E91E63] border-b pb-2">{t('form.section_prices')}</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                    <div><label className="block text-sm mb-1">{t('form.pricing_scope')}</label><select {...register('pricing_scope')} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"><option value="area">Area</option><option value="city">City</option></select></div>
                                    <div><label className="block text-sm mb-1">{t('form.base_price')}</label><input type="number" {...register('base_price')} className="w-full px-3 py-2 border border-gray-200 rounded-lg" /><ErrorMsg name="base_price"/></div>
                                    <div><label className="block text-sm mb-1">{t('form.price_per_hour')}</label><input type="number" {...register('price_per_hour')} className="w-full px-3 py-2 border border-gray-200 rounded-lg" /><ErrorMsg name="price_per_hour"/></div>
                                    <div><label className="block text-sm mb-1">{t('form.currency')}</label><input type="text" {...register('currency')} defaultValue="EGP" className="w-full px-3 py-2 border border-gray-200 rounded-lg" /></div>
                                </div>

                                <div className="border-t pt-4">
                                    <label className="block text-sm font-bold mb-2 text-gray-700">{t('form.workers')}</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto bg-gray-50">
                                        {isWorkersLoading ? (
                                            <span className="text-gray-500 text-sm">جاري جلب العمال...</span>
                                        ) : workersList.length === 0 ? (
                                            <span className="text-gray-500 text-sm">لا يوجد عمال متاحين.</span>
                                        ) : (
                                            workersList.map(worker => (
                                                <label key={worker.id} className="flex items-center gap-2 cursor-pointer bg-white p-2 border border-gray-100 rounded hover:bg-[#FDF0F3] transition-colors">
                                                    <input 
                                                        type="checkbox" 
                                                        value={String(worker.id)} 
                                                        {...register('workers')} 
                                                        className="w-4 h-4 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63]"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {worker.name} <span className="text-xs text-gray-400 font-normal">({worker.nationality})</span>
                                                    </span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                    <ErrorMsg name="workers" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4">
                                    <div><label className="block text-sm mb-1">{t('form.feature_ar')}</label><input type="text" {...register('feature_ar')} placeholder="تنظيف الأسطح" className="w-full px-3 py-2 border border-gray-200 rounded-lg" /></div>
                                    <div><label className="block text-sm mb-1">{t('form.feature_en')}</label><input type="text" {...register('feature_en')} placeholder="Surface Cleaning" className="w-full px-3 py-2 border border-gray-200 rounded-lg" /></div>
                                </div>
                            </div>

                            {/* 4. Rules */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                                <h4 className="font-bold text-[#E91E63] border-b pb-2">{t('form.section_rules')}</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div><label className="block text-xs text-gray-500 mb-1">{t('form.free_cancel')}</label><input type="number" {...register('free_cancel_cutoff_hours')} className="w-full px-3 py-2 border rounded-lg" /></div>
                                    <div><label className="block text-xs text-gray-500 mb-1">{t('form.reschedule_cutoff')}</label><input type="number" {...register('reschedule_cutoff_hours')} className="w-full px-3 py-2 border rounded-lg" /></div>
                                    <div><label className="block text-xs text-gray-500 mb-1">{t('form.lead_time_min')}</label><input type="number" {...register('lead_time_min_hours')} className="w-full px-3 py-2 border rounded-lg" /></div>
                                    <div><label className="block text-xs text-gray-500 mb-1">{t('form.lead_time_max')}</label><input type="number" {...register('lead_time_max_days')} className="w-full px-3 py-2 border rounded-lg" /></div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div><label className="block text-xs text-gray-500 mb-1">{t('form.cancel_action')}</label><select {...register('cancel_action')} className="w-full px-3 py-2 border rounded-lg bg-white"><option value="fee">Fee</option><option value="block">Block</option><option value="manual">Manual</option></select></div>
                                    <div><label className="block text-xs text-gray-500 mb-1">{t('form.cancel_fee_type')}</label><select {...register('cancel_fee_type')} className="w-full px-3 py-2 border rounded-lg bg-white"><option value="fixed">Fixed</option><option value="percent">Percent</option></select></div>
                                    <div><label className="block text-xs text-gray-500 mb-1">{t('form.cancel_fee_value')}</label><input type="number" {...register('cancel_fee_value')} className="w-full px-3 py-2 border rounded-lg" /></div>
                                    <div><label className="block text-xs text-gray-500 mb-1">{t('form.no_show')}</label><select {...register('no_show_policy')} className="w-full px-3 py-2 border rounded-lg bg-white"><option value="consumed">Consumed</option><option value="compensate">Compensate</option></select></div>
                                </div>
                            </div>

                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-white flex gap-3 rtl:flex-row-reverse justify-end mt-auto">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">{t('form.cancel')}</button>
                    <button type="submit" form="service-form" disabled={submitMutation.isPending || (isEditMode && isServiceLoading)} className="px-6 py-2.5 rounded-xl font-medium text-white bg-[#E91E63] hover:bg-[#D81B60] transition-colors disabled:opacity-70 min-w-[150px] flex justify-center items-center">
                        {submitMutation.isPending ? '...' : t('form.submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}