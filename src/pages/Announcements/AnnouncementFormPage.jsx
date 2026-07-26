import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { INPUT_CLASS, LABEL_CLASS, FormSection } from '../../components/form/FormKit';
import CustomerSelect from './CustomerSelect';

export default function AnnouncementFormPage() {
    const { id: announcementId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('announcements');
    const queryClient = useQueryClient();
    const isEditMode = !!announcementId;
    const isArabic = i18n.language?.startsWith('ar');

    const [selectedIds, setSelectedIds] = useState([]);
    const [sendToAll, setSendToAll] = useState(false);

    const schema = yup.object().shape({
        title: yup.string().required(t('validation.required')),
        body: yup.string().required(t('validation.required')),
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { title: '', body: '' },
    });

    // Fetch details in edit mode
    const { data: fullData, isLoading: isDetailsLoading } = useQuery({
        queryKey: ['announcementDetails', announcementId],
        queryFn: async () => (await axiosInstance.get(`/admin/announcements/${announcementId}`)).data.data,
        enabled: isEditMode,
    });

    useEffect(() => {
        if (isEditMode && fullData) {
            reset({ title: fullData.title || '', body: fullData.body || '' });
            setSelectedIds((fullData.reader_ids || []).map(Number));
            setSendToAll(Boolean(fullData.send_to_all));
        }
    }, [fullData, isEditMode, reset]);

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const payload = sendToAll
                ? { title: data.title, body: data.body, send_to_all: true }
                : { title: data.title, body: data.body, customer_ids: selectedIds };

            const url = isEditMode ? `/admin/announcements/${announcementId}` : '/admin/announcements';
            return isEditMode ? axiosInstance.put(url, payload) : axiosInstance.post(url, payload);
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم حفظ الإعلان بنجاح' : 'Announcement saved successfully'));
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
            queryClient.invalidateQueries({ queryKey: ['announcementDetails', announcementId] });
            navigate('/announcements');
        },
        onError: (error) => {
            const params = error.response?.data?.params;
            if (params) {
                toast.error(Object.values(params)[0]);
            } else {
                toast.error(error.response?.data?.message || (isArabic ? 'حدث خطأ أثناء الحفظ.' : 'Error saving announcement.'));
            }
        },
    });

    const onSubmit = (data) => {
        if (!sendToAll && selectedIds.length === 0) {
            toast.error(t('validation.recipients_required'));
            return;
        }
        submitMutation.mutate(data);
    };

    return (
        <div className="space-y-6 font-main max-w-7xl mx-auto pb-12">
            {/* Top Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
                <div>
                    <button
                        type="button"
                        onClick={() => navigate('/announcements')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E91E63] transition-colors mb-1.5 outline-none group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>{isArabic ? 'العودة لقائمة الإعلانات' : 'Back to Announcements'}</span>
                    </button>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                        {isEditMode ? (isArabic ? 'تعديل الإعلان الموجه' : 'Edit Announcement') : (isArabic ? 'إضافة إعلان موجه جديد' : 'Create New Announcement')}
                    </h2>
                </div>
            </div>

            {isEditMode && isDetailsLoading ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-20 flex flex-col items-center justify-center text-gray-400">
                    <svg className="animate-spin h-9 w-9 text-[#E91E63]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="font-bold text-sm text-gray-600 mt-3">{isArabic ? 'جاري تحميل بيانات الإعلان...' : 'Loading announcement data...'}</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Announcement Content */}
                    <FormSection icon="info" title={t('sections.details.title')} description={t('sections.details.desc')}>
                        <div className="space-y-4">
                            <div>
                                <label className={LABEL_CLASS}>{t('form.title_field')} *</label>
                                <input
                                    {...register('title')}
                                    placeholder={t('form.title_placeholder')}
                                    className={`${INPUT_CLASS} ${errors.title ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                />
                                {errors.title && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.title.message}</p>}
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>{t('form.body')} *</label>
                                <textarea
                                    {...register('body')}
                                    rows={5}
                                    placeholder={t('form.body_placeholder')}
                                    className={`${INPUT_CLASS} h-32 p-3.5 resize-y ${errors.body ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                />
                                {errors.body && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.body.message}</p>}
                            </div>
                        </div>
                    </FormSection>

                    {/* Target Audience Picker */}
                    <FormSection
                        icon="users"
                        title={t('sections.audience.title')}
                        description={t('sections.audience.desc')}
                        action={
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDF0F3] text-[#E91E63] px-3 py-1 text-xs font-bold whitespace-nowrap">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />
                                </svg>
                                {sendToAll ? t('picker.all_selected') : t('picker.selected', { num: selectedIds.length })}
                            </span>
                        }
                    >
                        <CustomerSelect
                            selectedIds={selectedIds}
                            onChange={setSelectedIds}
                            sendToAll={sendToAll}
                            onSendToAllChange={setSendToAll}
                        />
                    </FormSection>

                    {/* Action Bar Footer */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/announcements')}
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
                            <span>{isEditMode ? (isArabic ? 'تحديث الإعلان' : 'Update Announcement') : (isArabic ? 'حفظ وحفظ الإعلان' : 'Save Announcement')}</span>
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
