import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FullScreenFormModal from '../../components/form/FullScreenFormModal';
import { INPUT_CLASS, LABEL_CLASS, FormSection } from '../../components/form/FormKit';
import CustomerSelect from './CustomerSelect';

export default function AnnouncementActionModal({ announcementToEdit, onClose }) {
    const { t } = useTranslation('announcements');
    const queryClient = useQueryClient();
    const isEditMode = !!announcementToEdit;

    // Recipient selection state (owned here, submitted alongside the form fields).
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

    // Edit mode: fetch the announcement to pre-fill content and its recipients.
    const { data: fullData, isLoading: isDetailsLoading } = useQuery({
        queryKey: ['announcementDetails', announcementToEdit?.id],
        queryFn: async () => (await axiosInstance.get(`/admin/announcements/${announcementToEdit.id}`)).data.data,
        enabled: isEditMode,
    });

    useEffect(() => {
        if (isEditMode && fullData) {
            reset({ title: fullData.title || '', body: fullData.body || '' });
            setSelectedIds((fullData.reader_ids || []).map(Number));
            setSendToAll(false);
        }
    }, [fullData, isEditMode, reset]);

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const payload = sendToAll
                ? { title: data.title, body: data.body, send_to_all: true }
                : { title: data.title, body: data.body, customer_ids: selectedIds };

            const url = isEditMode ? `/admin/announcements/${announcementToEdit.id}` : '/admin/announcements';
            return isEditMode ? axiosInstance.put(url, payload) : axiosInstance.post(url, payload);
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || t('saved'));
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
            onClose();
        },
        onError: (error) => {
            const params = error.response?.data?.params;
            if (params) {
                toast.error(Object.values(params)[0]);
            } else {
                toast.error(error.response?.data?.message || t('error'));
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

    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    return (
        <FullScreenFormModal
            title={isEditMode ? t('form.title_edit') : t('form.title_add')}
            onClose={onClose}
            formId="announcement-form"
            onSubmit={handleSubmit(onSubmit)}
            isLoading={isEditMode && isDetailsLoading}
            isSubmitting={submitMutation.isPending}
            cancelLabel={t('form.cancel')}
            submitLabel={t('form.submit')}
        >
            <FormSection icon="info" title={t('sections.details.title')} description={t('sections.details.desc')}>
                <div>
                    <label className={LABEL_CLASS}>{t('form.title_field')}</label>
                    <input
                        {...register('title')}
                        placeholder={t('form.title_placeholder')}
                        className={`${INPUT_CLASS} ${errors.title ? 'border-red-500' : ''}`}
                    />
                    <ErrorMsg name="title" />
                </div>

                <div>
                    <label className={LABEL_CLASS}>{t('form.body')}</label>
                    <textarea
                        {...register('body')}
                        rows={5}
                        placeholder={t('form.body_placeholder')}
                        className={`${INPUT_CLASS} resize-y ${errors.body ? 'border-red-500' : ''}`}
                    />
                    <ErrorMsg name="body" />
                </div>
            </FormSection>

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
        </FullScreenFormModal>
    );
}
