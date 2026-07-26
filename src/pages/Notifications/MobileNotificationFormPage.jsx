import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { INPUT_CLASS, LABEL_CLASS, FormSection, SelectField } from '../../components/form/FormKit';

export default function MobileNotificationFormPage() {
    const { id: notificationId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('notifications');
    const queryClient = useQueryClient();
    const isEditMode = !!notificationId;
    const isArabic = i18n.language?.startsWith('ar');

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

    // Fetch in edit mode
    const { data: fullNotification, isLoading: isFetching } = useQuery({
        queryKey: ['mobileNotificationDetail', notificationId],
        queryFn: async () => (await axiosInstance.get(`/admin/mobile-notifications/${notificationId}`)).data.data,
        enabled: isEditMode,
    });

    useEffect(() => {
        if (isEditMode && fullNotification) {
            reset({
                title: fullNotification.title || '',
                audience: fullNotification.audience || 'all',
                send_date: fullNotification.send_date || '',
                send_time: fullNotification.send_time ? fullNotification.send_time.substring(0, 5) : '',
                platforms: ['ios', 'android'],
                languages: ['ar', 'en'],
                title_ar: fullNotification.title_ar || '',
                content_ar: fullNotification.content_ar || '',
                title_en: fullNotification.title_en || '',
                content_en: fullNotification.content_en || '',
            });
        }
    }, [fullNotification, isEditMode, reset]);

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const url = isEditMode ? `/admin/mobile-notifications/${notificationId}` : '/admin/mobile-notifications';
            const method = isEditMode ? 'put' : 'post';
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
            queryClient.invalidateQueries({ queryKey: ['mobileNotificationDetail', notificationId] });
            navigate('/mobile-notifications');
        },
        onError: (error) => {
            const validationErrors = error.response?.data?.errors || error.response?.data?.params;
            if (validationErrors) {
                Object.entries(validationErrors).forEach(([key, messages]) => {
                    const message = Array.isArray(messages) ? messages[0] : messages;
                    setError(key, { type: 'server', message });
                });
            }
            const msg = error.response?.data?.message || (isArabic ? 'فشل التحقق من البيانات' : 'Validation failed');
            toast.error(msg);
        },
    });

    const onSubmit = (data) => submitMutation.mutate(data);

    return (
        <div className="space-y-6 font-main max-w-7xl mx-auto pb-12">
            {/* Top Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
                <div>
                    <button
                        type="button"
                        onClick={() => navigate('/mobile-notifications')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E91E63] transition-colors mb-1.5 outline-none group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>{isArabic ? 'العودة لقائمة الإشعارات' : 'Back to Notifications'}</span>
                    </button>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                        {isEditMode ? (isArabic ? 'تعديل الإشعار المجدول' : 'Edit Scheduled Notification') : (isArabic ? 'جدولة إشعار مجدول جديد' : 'Schedule New Push Notification')}
                    </h2>
                </div>
            </div>

            {isEditMode && isFetching ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-20 flex flex-col items-center justify-center text-gray-400">
                    <svg className="animate-spin h-9 w-9 text-[#E91E63]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="font-bold text-sm text-gray-600 mt-3">{isArabic ? 'جاري تحميل بيانات الإشعار...' : 'Loading notification data...'}</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* General Settings */}
                    <FormSection
                        icon="info"
                        title={isArabic ? 'إعدادات الإشعار' : 'Notification Settings'}
                        description={isArabic ? 'حدد عنوان الإشعار والجمهور المستهدف وتفاصيل الجدولة.' : 'Specify the internal notification title, target audience, and scheduling parameters.'}
                    >
                        <div className="space-y-4">
                            <div>
                                <label className={LABEL_CLASS}>{isArabic ? 'العنوان الداخلي للإشعار (يظهر للإدارة فقط) *' : 'Internal Title (visible to admin only) *'}</label>
                                <input
                                    {...register('title')}
                                    placeholder={isArabic ? 'مثال: عرض نهاية الأسبوع للعملاء النشطين' : 'e.g., Weekend offer for active customers'}
                                    className={`${INPUT_CLASS} ${errors.title ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                />
                                {errors.title && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.title.message}</p>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className={LABEL_CLASS}>{isArabic ? 'الجمهور المستهدف *' : 'Target Audience *'}</label>
                                    <SelectField registration={register('audience')}>
                                        <option value="all">{isArabic ? 'كل المستخدمين' : 'All Users'}</option>
                                        <option value="active_customers">{isArabic ? 'العملاء النشطين (لديهم حجوزات)' : 'Active Customers (have bookings)'}</option>
                                        <option value="inactive_customers">{isArabic ? 'العملاء غير النشطين (ليس لديهم حجوزات)' : 'Inactive Customers (no bookings)'}</option>
                                    </SelectField>
                                    {errors.audience && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.audience.message}</p>}
                                </div>

                                <div>
                                    <label className={LABEL_CLASS}>{isArabic ? 'تاريخ الإرسال *' : 'Send Date *'}</label>
                                    <input
                                        type="date"
                                        {...register('send_date')}
                                        className={`${INPUT_CLASS} ${errors.send_date ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                    />
                                    {errors.send_date && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.send_date.message}</p>}
                                </div>

                                <div>
                                    <label className={LABEL_CLASS}>{isArabic ? 'وقت الإرسال *' : 'Send Time *'}</label>
                                    <input
                                        type="time"
                                        {...register('send_time')}
                                        className={`${INPUT_CLASS} ${errors.send_time ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                    />
                                    {errors.send_time && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.send_time.message}</p>}
                                </div>
                            </div>
                        </div>
                    </FormSection>

                    {/* Arabic Content */}
                    <FormSection
                        icon="sparkles"
                        title={isArabic ? 'المحتوى باللغة العربية' : 'Arabic Content'}
                        description={isArabic ? 'أدخل العنوان والرسالة التي ستظهر للعميل باللغة العربية.' : 'Enter title and content details shown to Arabic clients.'}
                    >
                        <div className="space-y-4">
                            <div>
                                <label className={LABEL_CLASS}>{isArabic ? 'عنوان الإشعار (عربي) *' : 'Notification Title (Arabic) *'}</label>
                                <input
                                    {...register('title_ar')}
                                    placeholder={isArabic ? 'مثال: خصم 20% بانتظارك!' : 'e.g., Special discount awaits you!'}
                                    className={`${INPUT_CLASS} ${errors.title_ar ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                />
                                {errors.title_ar && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.title_ar.message}</p>}
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>{isArabic ? 'محتوى الإشعار (عربي) *' : 'Notification Content (Arabic) *'}</label>
                                <textarea
                                    {...register('content_ar')}
                                    rows={3}
                                    placeholder={isArabic ? 'تفاصيل الإشعار الذي يظهر للعميل عند الاستلام...' : 'Message contents shown to Arabic users...'}
                                    className={`${INPUT_CLASS} h-24 p-3.5 resize-y ${errors.content_ar ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                />
                                {errors.content_ar && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.content_ar.message}</p>}
                            </div>
                        </div>
                    </FormSection>

                    {/* English Content */}
                    <FormSection
                        icon="sparkles"
                        title={isArabic ? 'المحتوى باللغة الإنجليزية' : 'English Content'}
                        description={isArabic ? 'أدخل العنوان والرسالة التي ستظهر للعميل باللغة الإنجليزية.' : 'Enter title and content details shown to English clients.'}
                    >
                        <div className="space-y-4">
                            <div>
                                <label className={LABEL_CLASS}>{isArabic ? 'عنوان الإشعار (إنجليزي) *' : 'Notification Title (English) *'}</label>
                                <input
                                    {...register('title_en')}
                                    placeholder="e.g., Get 20% off your booking today!"
                                    className={`${INPUT_CLASS} ${errors.title_en ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                />
                                {errors.title_en && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.title_en.message}</p>}
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>{isArabic ? 'محتوى الإشعار (إنجليزي) *' : 'Notification Content (English) *'}</label>
                                <textarea
                                    {...register('content_en')}
                                    rows={3}
                                    placeholder="Message details shown to English language app clients..."
                                    className={`${INPUT_CLASS} h-24 p-3.5 resize-y ${errors.content_en ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                />
                                {errors.content_en && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.content_en.message}</p>}
                            </div>
                        </div>
                    </FormSection>

                    {/* Action Bar Footer */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/mobile-notifications')}
                            className="px-5 h-11 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors outline-none"
                        >
                            {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={submitMutation.isPending}
                            className="px-6 h-11 rounded-xl text-xs font-bold bg-[#E91E63] text-white hover:bg-[#D81B60] transition-colors shadow-2xs flex items-center gap-2 outline-none disabled:opacity-50"
                        >
                            {submitMutation.isPending && (
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            <span>{isEditMode ? (isArabic ? 'تحديث الإشعار' : 'Update Notification') : (isArabic ? 'حفظ وجدولة الإشعار' : 'Save & Schedule Notification')}</span>
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
