import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { INPUT_CLASS, LABEL_CLASS, OptionCards, ImageDropzone, FormSection } from '../../components/form/FormKit';

export default function BannerFormPage() {
    const { id: bannerId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('banners');
    const queryClient = useQueryClient();
    const isEditMode = !!bannerId;
    const isArabic = i18n.language?.startsWith('ar');

    const schema = yup.object().shape({
        title_en: yup.string().required(t('validation.required')),
        title_ar: yup.string().required(t('validation.required')),
        status: yup.string().required(t('validation.required')),
    });

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            title_en: '',
            title_ar: '',
            status: 'active',
        },
    });

    const statusValue = watch('status');

    // Fetch details if in edit mode
    const { data: fullBanner, isLoading: isFetching } = useQuery({
        queryKey: ['bannerDetail', bannerId],
        queryFn: async () => (await axiosInstance.get(`/admin/ads/${bannerId}`)).data.data,
        enabled: isEditMode,
    });

    useEffect(() => {
        if (isEditMode && fullBanner) {
            reset({
                title_en: fullBanner.title_en || '',
                title_ar: fullBanner.title_ar || '',
                status: fullBanner.status || 'active',
            });
        }
    }, [fullBanner, isEditMode, reset]);

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const payload = new FormData();
            if (isEditMode) payload.append('_method', 'PUT');
            payload.append('title_en', data.title_en);
            payload.append('title_ar', data.title_ar);
            payload.append('status', data.status);

            if (data.image && data.image[0]) {
                payload.append('image', data.image[0]);
            }

            const url = isEditMode ? `/admin/ads/${bannerId}` : '/admin/ads';
            return axiosInstance.post(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم حفظ البنر الإعلاني بنجاح' : 'Banner saved successfully'));
            queryClient.invalidateQueries({ queryKey: ['banners'] });
            queryClient.invalidateQueries({ queryKey: ['bannerDetail', bannerId] });
            navigate('/banners');
        },
        onError: (error) => {
            const params = error.response?.data?.params;
            if (params) {
                toast.error(Object.values(params)[0]);
            } else {
                toast.error(error.response?.data?.message || (isArabic ? 'حدث خطأ أثناء الحفظ.' : 'Error saving banner.'));
            }
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
                        onClick={() => navigate('/banners')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E91E63] transition-colors mb-1.5 outline-none group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>{isArabic ? 'العودة للإعلانات البنريّة' : 'Back to Banners'}</span>
                    </button>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                        {isEditMode ? (isArabic ? 'تعديل البنر الإعلاني' : 'Edit Banner') : (isArabic ? 'إضافة بنر إعلاني جديد' : 'Create New Banner')}
                    </h2>
                </div>
            </div>

            {isEditMode && isFetching ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-20 flex flex-col items-center justify-center text-gray-400">
                    <svg className="animate-spin h-9 w-9 text-[#E91E63]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="font-bold text-sm text-gray-600 mt-3">{isArabic ? 'جاري تحميل بيانات البنر...' : 'Loading banner data...'}</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <FormSection icon="sparkles" title={t('sections.details.title')} description={t('sections.details.desc')}>
                        {/* Titles */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASS}>{t('form.title_en')} *</label>
                                <input
                                    {...register('title_en')}
                                    className={`${INPUT_CLASS} ${errors.title_en ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                />
                                {errors.title_en && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.title_en.message}</p>}
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>{t('form.title_ar')} *</label>
                                <input
                                    {...register('title_ar')}
                                    className={`${INPUT_CLASS} ${errors.title_ar ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                />
                                {errors.title_ar && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.title_ar.message}</p>}
                            </div>
                        </div>

                        {/* Image */}
                        <div>
                            <ImageDropzone
                                register={register}
                                watch={watch}
                                currentImage={isEditMode ? fullBanner?.image : null}
                                label={t('form.image')}
                                uploadText={t('form.upload_image')}
                                changeText={t('form.change_image')}
                            />
                        </div>

                        {/* Status Selection */}
                        <div>
                            <label className={LABEL_CLASS}>{t('form.status')} *</label>
                            <OptionCards
                                value={statusValue}
                                onChange={(v) => setValue('status', v, { shouldValidate: true })}
                                options={[
                                    { value: 'active', label: t('status.active'), dot: 'bg-emerald-500' },
                                    { value: 'inactive', label: t('status.inactive'), dot: 'bg-gray-400' },
                                ]}
                            />
                        </div>
                    </FormSection>

                    {/* Action Bar Footer */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/banners')}
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
                            <span>{isEditMode ? (isArabic ? 'تحديث البنر' : 'Update Banner') : (isArabic ? 'حفظ البنر' : 'Save Banner')}</span>
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
