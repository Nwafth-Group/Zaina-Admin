import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FullScreenFormModal from '../../components/form/FullScreenFormModal';
import { INPUT_CLASS, LABEL_CLASS, FormSection, SelectField } from '../../components/form/FormKit';

export default function MobileNotificationActionModal({ notificationToEdit, onClose }) {
    const { t } = useTranslation('notifications');
    const queryClient = useQueryClient();
    const isEditMode = !!notificationToEdit;

    const schema = yup.object().shape({
        title: yup.string().required('العنوان الداخلي مطلوب'),
        audience: yup.string().required('تحديد الجمهور مطلوب'),
        send_date: yup.string().required('تاريخ الإرسال مطلوب'),
        send_time: yup.string().required('وقت الإرسال مطلوب'),
        platforms: yup.array().of(yup.string()).min(1, 'يجب اختيار منصة واحدة على الأقل'),
        languages: yup.array().of(yup.string()).min(1, 'يجب اختيار لغة واحدة على الأقل'),
        title_ar: yup.string().when('languages', (langs, schema) => (
            langs[0]?.includes('ar') ? schema.required('العنوان بالعربية مطلوب') : schema.nullable()
        )),
        content_ar: yup.string().when('languages', (langs, schema) => (
            langs[0]?.includes('ar') ? schema.required('المحتوى بالعربية مطلوب') : schema.nullable()
        )),
        title_en: yup.string().when('languages', (langs, schema) => (
            langs[0]?.includes('en') ? schema.required('English title is required') : schema.nullable()
        )),
        content_en: yup.string().when('languages', (langs, schema) => (
            langs[0]?.includes('en') ? schema.required('English content is required') : schema.nullable()
        )),
    });

    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            title: '',
            audience: 'all',
            send_date: new Date().toISOString().slice(0, 10),
            send_time: '12:00',
            platforms: ['ios', 'android'],
            languages: ['ar'],
            title_ar: '',
            content_ar: '',
            title_en: '',
            content_en: '',
        },
    });

    const selectedLanguages = watch('languages') || [];

    useEffect(() => {
        if (isEditMode && notificationToEdit) {
            // Determine active languages based on content availability
            const langs = [];
            if (notificationToEdit.title_ar || notificationToEdit.content_ar) langs.push('ar');
            if (notificationToEdit.title_en || notificationToEdit.content_en) langs.push('en');

            reset({
                title: notificationToEdit.title || '',
                audience: notificationToEdit.audience || 'all',
                send_date: notificationToEdit.send_date || '',
                send_time: notificationToEdit.send_time ? notificationToEdit.send_time.substring(0, 5) : '',
                platforms: notificationToEdit.platforms || [],
                languages: langs,
                title_ar: notificationToEdit.title_ar || '',
                content_ar: notificationToEdit.content_ar || '',
                title_en: notificationToEdit.title_en || '',
                content_en: notificationToEdit.content_en || '',
            });
        }
    }, [notificationToEdit, isEditMode, reset]);

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const url = isEditMode ? `/admin/mobile-notifications/${notificationToEdit.id}` : '/admin/mobile-notifications';
            const method = isEditMode ? 'put' : 'post';
            return axiosInstance[method](url, data);
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || 'تم حفظ وجدولة الإشعار بنجاح');
            queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] });
            onClose();
        },
        onError: (error) => {
            const msg = error.response?.data?.message || 'حدث خطأ أثناء العملية.';
            toast.error(msg);
        },
    });

    const onSubmit = (data) => submitMutation.mutate(data);
    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    return (
        <FullScreenFormModal
            title={isEditMode ? 'تعديل إشعار مجدول' : 'جدولة إشعار جديد'}
            onClose={onClose}
            formId="notification-form"
            onSubmit={handleSubmit(onSubmit)}
            isSubmitting={submitMutation.isPending}
            cancelLabel="إلغاء"
            submitLabel="حفظ الإشعار"
        >
            <FormSection icon="info" title="إعدادات الإشعار" description="حدد عنوان الإشعار والجمهور المستهدف وتفاصيل الجدولة.">
                
                {/* Title */}
                <div>
                    <label className={LABEL_CLASS}>العنوان الداخلي للإشعار (يظهر للإدارة فقط)</label>
                    <input
                        {...register('title')}
                        placeholder="مثال: عرض نهاية الأسبوع للعملاء النشطين"
                        className={`${INPUT_CLASS} ${errors.title ? 'border-red-500' : ''}`}
                    />
                    <ErrorMsg name="title" />
                </div>

                {/* Audience Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>الجمهور المستهدف</label>
                        <SelectField registration={register('audience')}>
                            <option value="all">كل المستخدمين</option>
                            <option value="active_customers">العملاء النشطين (لديهم حجوزات)</option>
                            <option value="inactive_customers">العملاء غير النشطين (ليس لديهم حجوزات)</option>
                        </SelectField>
                        <ErrorMsg name="audience" />
                    </div>

                    {/* Platforms Selection */}
                    <div>
                        <label className={LABEL_CLASS}>المنصات المستهدفة</label>
                        <div className="flex gap-4 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" value="ios" {...register('platforms')} className="w-4 h-4 text-[#E91E63] rounded focus:ring-[#E91E63]" />
                                <span className="text-sm font-medium text-gray-700">iOS (Apple)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" value="android" {...register('platforms')} className="w-4 h-4 text-[#E91E63] rounded focus:ring-[#E91E63]" />
                                <span className="text-sm font-medium text-gray-700">Android</span>
                            </label>
                        </div>
                        <ErrorMsg name="platforms" />
                    </div>
                </div>

                {/* Scheduling Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>تاريخ الإرسال</label>
                        <input
                            type="date"
                            {...register('send_date')}
                            className={`${INPUT_CLASS} ${errors.send_date ? 'border-red-500' : ''}`}
                        />
                        <ErrorMsg name="send_date" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>وقت الإرسال</label>
                        <input
                            type="time"
                            {...register('send_time')}
                            className={`${INPUT_CLASS} ${errors.send_time ? 'border-red-500' : ''}`}
                        />
                        <ErrorMsg name="send_time" />
                    </div>
                </div>

                {/* Targeted Languages */}
                <div>
                    <label className={LABEL_CLASS}>اللغات المستهدفة (محتوى الإشعار المترسل للعميل)</label>
                    <div className="flex gap-4 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" value="ar" {...register('languages')} className="w-4 h-4 text-[#E91E63] rounded focus:ring-[#E91E63]" />
                            <span className="text-sm font-medium text-gray-700">العربية</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" value="en" {...register('languages')} className="w-4 h-4 text-[#E91E63] rounded focus:ring-[#E91E63]" />
                            <span className="text-sm font-medium text-gray-700">English</span>
                        </label>
                    </div>
                    <ErrorMsg name="languages" />
                </div>
            </FormSection>

            {/* Arabic Content (Conditional) */}
            {selectedLanguages.includes('ar') && (
                <FormSection icon="sparkles" title="المحتوى باللغة العربية" description="أدخل العنوان والرسالة التي ستظهر للعميل باللغة العربية.">
                    <div className="space-y-4">
                        <div>
                            <label className={LABEL_CLASS}>عنوان الإشعار (عربي)</label>
                            <input
                                {...register('title_ar')}
                                placeholder="مثال: خصم 20% بانتظارك!"
                                className={`${INPUT_CLASS} ${errors.title_ar ? 'border-red-500' : ''}`}
                            />
                            <ErrorMsg name="title_ar" />
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>محتوى الإشعار (عربي)</label>
                            <textarea
                                {...register('content_ar')}
                                rows={3}
                                placeholder="تفاصيل الإشعار الذي يظهر للعميل عند الاستلام..."
                                className={`${INPUT_CLASS} ${errors.content_ar ? 'border-red-500' : ''}`}
                            />
                            <ErrorMsg name="content_ar" />
                        </div>
                    </div>
                </FormSection>
            )}

            {/* English Content (Conditional) */}
            {selectedLanguages.includes('en') && (
                <FormSection icon="sparkles" title="English Content" description="Enter the push notification title and body message in English.">
                    <div className="space-y-4">
                        <div>
                            <label className={LABEL_CLASS}>Notification Title (English)</label>
                            <input
                                {...register('title_en')}
                                placeholder="e.g., Get 20% off your booking today!"
                                className={`${INPUT_CLASS} ${errors.title_en ? 'border-red-500' : ''}`}
                            />
                            <ErrorMsg name="title_en" />
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>Notification Body (English)</label>
                            <textarea
                                {...register('content_en')}
                                rows={3}
                                placeholder="Type the push content message shown to English language users..."
                                className={`${INPUT_CLASS} ${errors.content_en ? 'border-red-500' : ''}`}
                            />
                            <ErrorMsg name="content_en" />
                        </div>
                    </div>
                </FormSection>
            )}
        </FullScreenFormModal>
    );
}
