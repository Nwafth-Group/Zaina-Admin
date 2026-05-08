import React, { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

export default function WorkerActionModal({ workerToEdit, onClose }) {
    const { t, i18n } = useTranslation('workers');
    const queryClient = useQueryClient();
    const isEditMode = !!workerToEdit;

    // 1. جلب الخدمات المتاحة لعرضها كـ Checkboxes
    const { data: servicesList, isLoading: isServicesLoading } = useQuery({
        queryKey: ['servicesList'],
        queryFn: async () => {
            const response = await axiosInstance.get('/admin/services');
            return response.data.data.items || [];
        },
    });

    // 2. جلب بيانات العامل كاملة في حالة التعديل
    const { data: fullWorkerData, isLoading: isWorkerLoading } = useQuery({
        queryKey: ['workerDetails', workerToEdit?.id],
        queryFn: async () => {
            const response = await axiosInstance.get(`/admin/workers/${workerToEdit.id}`);
            return response.data.data;
        },
        enabled: isEditMode,
    });

    // 3. إعداد الـ Validation Schema
    const schema = yup.object().shape({
        name: yup.string().required(t('validation.required')),
        nationality: yup.string().required(t('validation.required')),
        status: yup.string().required(t('validation.required')),
        // اختيارياً يمكنك جعل اختيار خدمة واحدة على الأقل إجبارياً:
        // services: yup.array().of(yup.string()).min(1, t('validation.required')),
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { status: 'active', services: [] }
    });

    // 4. تعبئة البيانات عند التعديل
    useEffect(() => {
        if (isEditMode && fullWorkerData) {
            reset({
                name: fullWorkerData.name || '',
                nationality: fullWorkerData.nationality || '',
                status: fullWorkerData.status || 'active',
                // إذا كان الباك إند يرجع مصفوفة بالخدمات التابعة للعامل، نقوم بتعبئتها
                services: fullWorkerData.services?.map(s => String(s.id)) || [],
            });
        }
    }, [fullWorkerData, isEditMode, reset]);

    // 5. عملية الحفظ (Create / Update)
    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const payload = new FormData();
            
            if (isEditMode) payload.append('_method', 'PUT');

            payload.append('name', data.name);
            payload.append('nationality', data.nationality);
            payload.append('status', data.status);
            
            if (data.image && data.image[0]) {
                payload.append('image', data.image[0]);
            }

            if (data.services && data.services.length > 0) {
                data.services.forEach(serviceId => {
                    payload.append('services[]', serviceId);
                });
            }

            const url = isEditMode ? `/admin/workers/${workerToEdit.id}` : '/admin/workers';
            return axiosInstance.post(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || "تم حفظ بيانات العامل بنجاح");
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "حدث خطأ أثناء الحفظ.");
        }
    });

    const onSubmit = (data) => submitMutation.mutate(data);
    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 font-main">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
                
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-800">{isEditMode ? t('form.title_edit') : t('form.title_add')}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="overflow-y-auto p-6 bg-[#F8F9FA]">
                    {isEditMode && isWorkerLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <svg className="animate-spin h-8 w-8 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                        </div>
                    ) : (
                        <form id="worker-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('form.name')}</label>
                                        <input {...register('name')} className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-colors ${errors.name ? 'border-red-500' : 'border-gray-200 focus:border-[#E91E63]'}`} />
                                        <ErrorMsg name="name" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('form.nationality')}</label>
                                        <input {...register('nationality')} className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-colors ${errors.nationality ? 'border-red-500' : 'border-gray-200 focus:border-[#E91E63]'}`} />
                                        <ErrorMsg name="nationality" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('form.status')}</label>
                                        <select {...register('status')} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none bg-white focus:border-[#E91E63]">
                                            <option value="active">{t('status.active', { ns: 'workers' })}</option>
                                            <option value="inactive">{t('status.inactive', { ns: 'workers' })}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('form.image')}</label>
                                        {isEditMode && fullWorkerData?.image && <img src={fullWorkerData.image} alt="Worker" className="h-10 w-10 object-cover rounded mb-2 border"/>}
                                        <input type="file" accept="image/*" {...register('image')} className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#FDF0F3] file:text-[#E91E63]" />
                                    </div>
                                </div>
                            </div>

                            {/* اختيار الخدمات */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <label className="block text-sm font-bold mb-3 text-gray-700">{t('form.services')}</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-2 border border-gray-100 rounded-lg bg-gray-50/50">
                                    {isServicesLoading ? (
                                        <span className="text-sm text-gray-500">جاري تحميل الخدمات...</span>
                                    ) : servicesList.length === 0 ? (
                                        <span className="text-sm text-gray-500">لا يوجد خدمات متاحة.</span>
                                    ) : (
                                        servicesList.map(service => (
                                            <label key={service.id} className="flex items-center gap-2 cursor-pointer bg-white p-2 border border-gray-200 rounded hover:bg-[#FDF0F3] transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    value={String(service.id)} 
                                                    {...register('services')} 
                                                    className="w-4 h-4 text-[#E91E63] rounded focus:ring-[#E91E63]"
                                                />
                                                <span className="text-sm text-gray-700 line-clamp-1">
                                                    {i18n.language === 'ar' ? service.name_ar : service.name_en}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                                <ErrorMsg name="services" />
                            </div>

                        </form>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-white flex gap-3 rtl:flex-row-reverse justify-end mt-auto">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">{t('form.cancel')}</button>
                    <button type="submit" form="worker-form" disabled={submitMutation.isPending || (isEditMode && isWorkerLoading)} className="px-6 py-2.5 rounded-xl font-medium text-white bg-[#E91E63] hover:bg-[#D81B60] transition-colors disabled:opacity-70 min-w-[120px] flex justify-center items-center">
                        {submitMutation.isPending ? '...' : t('form.submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}