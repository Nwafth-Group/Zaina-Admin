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
    const { t, i18n } = useTranslation('notifications');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();
    const isEditMode = !!notificationToEdit;

    // Both languages and platforms are always required and validated now
    const schema = yup.object().shape({
        title: yup.string().required(isArabic ? 'العنوان الداخلي مطلوب' : 'Internal title is required'),
        audience: yup.string().required(isArabic ? 'تحديد الجمهور مطلوب' : 'Audience selection is required'),
        send_date: yup.string().required(isArabic ? 'تاريخ الإرسال مطلوب' : 'Send date is required'),
        send_time: yup.string().required(isArabic ? 'وقت الإرسال مطلوب' : 'Send time is required'),
        title_ar: yup.string().required(isArabic ? 'العنوان بالعربية مطلوب' : 'Arabic title is required'),
        content_ar: yup.string().required(isArabic ? 'المحتوى بالعربية مطلوب' : 'Arabic content is required'),
        title_en: yup.string().required(isArabic ? 'العنوان بالإنجليزية مطلوب' : 'English title is required'),
        content_en: yup.string().required(isArabic ? 'المحتوى بالإنجليزية مطلوب' : 'English content is required'),
    });

    const { register, handleSubmit, reset, setError, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            title: '',
            audience: 'all',
            send_date: new Date().toISOString().slice(0, 10),
            send_time: '12:00',
            platforms: ['ios', 'android'],
            languages: ['ar', 'en'],
            title_ar: '',
            content_ar: '',
            title_en: '',
            content_en: '',
        },
    });

    useEffect(() => {
        if (isEditMode && notificationToEdit) {
            reset({
                title: notificationToEdit.title || '',
                audience: notificationToEdit.audience || 'all',
                send_date: notificationToEdit.send_date || '',
                send_time: notificationToEdit.send_time ? notificationToEdit.send_time.substring(0, 5) : '',
                platforms: ['ios', 'android'],
                languages: ['ar', 'en'],
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
            // Always assert both platforms and languages are sent to API
            const payload = {
                ...data,
                platforms: ['ios', 'android'],
                languages: ['ar', 'en'],
            };
            return axiosInstance[method](url, payload);
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم حفظ وجدولة الإشعار بنجاح' : 'Notification saved and scheduled successfully'));
            queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] });
            onClose();
        },
        onError: (error) => {
            const validationErrors = error.response?.data?.errors;
            if (validationErrors) {
                Object.entries(validationErrors).forEach(([key, messages]) => {
                    const message = Array.isArray(messages) ? messages[0] : messages;
                    setError(key, { type: 'server', message });
                });

                const firstErrKey = Object.keys(validationErrors)[0];
                const firstErrMsg = validationErrors[firstErrKey];
                const message = Array.isArray(firstErrMsg) ? firstErrMsg[0] : firstErrMsg;
                toast.error(message || (isArabic ? 'حدث خطأ في التحقق من البيانات.' : 'Validation error occurred.'));
            } else {
                const msg = error.response?.data?.message || (isArabic ? 'حدث خطأ أثناء العملية.' : 'An error occurred during the request.');
                toast.error(msg);
            }
        },
    });

    const onSubmit = (data) => submitMutation.mutate(data);
    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    return (
        <FullScreenFormModal
            title={isEditMode ? (isArabic ? 'تعديل إشعار مجدول' : 'Edit Scheduled Notification') : (isArabic ? 'جدولة إشعار جديد' : 'Schedule New Push Notification')}
            onClose={onClose}
            formId="notification-form"
            onSubmit={handleSubmit(onSubmit)}
            isSubmitting={submitMutation.isPending}
            cancelLabel={isArabic ? 'إلغاء' : 'Cancel'}
            submitLabel={isArabic ? 'حفظ الإشعار' : 'Save Notification'}
        >
            <FormSection 
                icon="info" 
                title={isArabic ? 'إعدادات الإشعار' : 'Notification Settings'} 
                description={isArabic ? 'حدد عنوان الإشعار والجمهور المستهدف وتفاصيل الجدولة.' : 'Specify the internal notification title, target audience, and scheduling parameters.'}
            >
                {/* Title */}
                <div>
                    <label className={LABEL_CLASS}>{isArabic ? 'العنوان الداخلي للإشعار (يظهر للإدارة فقط)' : 'Internal Notification Title (visible to admin only)'}</label>
                    <input
                        {...register('title')}
                        placeholder={isArabic ? 'مثال: عرض نهاية الأسبوع للعملاء النشطين' : 'e.g., Weekend offer for active customers'}
                        className={`${INPUT_CLASS} ${errors.title ? 'border-red-500' : ''}`}
                    />
                    <ErrorMsg name="title" />
                </div>

                {/* Audience Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'الجمهور المستهدف' : 'Target Audience'}</label>
                        <SelectField registration={register('audience')}>
                            <option value="all">{isArabic ? 'كل المستخدمين' : 'All Users'}</option>
                            <option value="active_customers">{isArabic ? 'العملاء النشطين (لديهم حجوزات)' : 'Active Customers (have bookings)'}</option>
                            <option value="inactive_customers">{isArabic ? 'العملاء غير النشطين (ليس لديهم حجوزات)' : 'Inactive Customers (no bookings)'}</option>
                        </SelectField>
                        <ErrorMsg name="audience" />
                    </div>
                </div>

                {/* Scheduling Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'تاريخ الإرسال' : 'Send Date'}</label>
                        <input
                            type="date"
                            {...register('send_date')}
                            className={`${INPUT_CLASS} ${errors.send_date ? 'border-red-500' : ''}`}
                        />
                        <ErrorMsg name="send_date" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'وقت الإرسال' : 'Send Time'}</label>
                        <input
                            type="time"
                            {...register('send_time')}
                            className={`${INPUT_CLASS} ${errors.send_time ? 'border-red-500' : ''}`}
                        />
                        <ErrorMsg name="send_time" />
                    </div>
                </div>
            </FormSection>

            {/* Arabic Content (Always Visible) */}
            <FormSection 
                icon="sparkles" 
                title={isArabic ? 'المحتوى باللغة العربية' : 'Arabic Content'} 
                description={isArabic ? 'أدخل العنوان والرسالة التي ستظهر للعميل باللغة العربية.' : 'Enter the title and message details to show to Arabic language clients.'}
            >
                <div className="space-y-4">
                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'عنوان الإشعار (عربي)' : 'Notification Title (Arabic)'}</label>
                        <input
                            {...register('title_ar')}
                            placeholder={isArabic ? 'مثال: خصم 20% بانتظارك!' : 'e.g., Special discount awaits you!'}
                            className={`${INPUT_CLASS} ${errors.title_ar ? 'border-red-500' : ''}`}
                        />
                        <ErrorMsg name="title_ar" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'محتوى الإشعار (عربي)' : 'Notification Content (Arabic)'}</label>
                        <textarea
                            {...register('content_ar')}
                            rows={3}
                            placeholder={isArabic ? 'تفاصيل الإشعار الذي يظهر للعميل عند الاستلام...' : 'Message contents shown to Arabic users...'}
                            className={`${INPUT_CLASS} ${errors.content_ar ? 'border-red-500' : ''}`}
                        />
                        <ErrorMsg name="content_ar" />
                    </div>
                </div>
            </FormSection>

            {/* English Content (Always Visible) */}
            <FormSection 
                icon="sparkles" 
                title={isArabic ? 'المحتوى باللغة الإنجليزية' : 'English Content'} 
                description={isArabic ? 'أدخل العنوان والرسالة التي ستظهر للعميل باللغة الإنجليزية.' : 'Enter the push notification title and body message in English.'}
            >
                <div className="space-y-4">
                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'عنوان الإشعار (إنجليزي)' : 'Notification Title (English)'}</label>
                        <input
                            {...register('title_en')}
                            placeholder="e.g., Get 20% off your booking today!"
                            className={`${INPUT_CLASS} ${errors.title_en ? 'border-red-500' : ''}`}
                        />
                        <ErrorMsg name="title_en" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'محتوى الإشعار (إنجليزي)' : 'Notification Content (English)'}</label>
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
        </FullScreenFormModal>
    );
}
