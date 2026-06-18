import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FullScreenFormModal from '../../components/form/FullScreenFormModal';
import { INPUT_CLASS, LABEL_CLASS, OptionCards, ImageDropzone, FormSection } from '../../components/form/FormKit';

export default function BannerActionModal({ bannerToEdit, onClose }) {
    const { t } = useTranslation('banners');
    const queryClient = useQueryClient();
    const isEditMode = !!bannerToEdit;

    const schema = yup.object().shape({
        link: yup.string().nullable(),
        status: yup.string().required(t('validation.required')),
    });

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { link: '', status: 'active' },
    });

    const statusValue = watch('status');

    useEffect(() => {
        if (isEditMode && bannerToEdit) {
            reset({
                link: bannerToEdit.link || '',
                status: bannerToEdit.status || 'active',
            });
        }
    }, [bannerToEdit, isEditMode, reset]);

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const payload = new FormData();
            if (isEditMode) payload.append('_method', 'PUT');
            payload.append('link', data.link || '');
            payload.append('status', data.status);
            if (data.image && data.image[0]) payload.append('image', data.image[0]);

            const url = isEditMode ? `/admin/ads/${bannerToEdit.id}` : '/admin/ads';
            return axiosInstance.post(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || t('saved'));
            queryClient.invalidateQueries({ queryKey: ['banners'] });
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

    const onSubmit = (data) => submitMutation.mutate(data);
    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    return (
        <FullScreenFormModal
            title={isEditMode ? t('form.title_edit') : t('form.title_add')}
            onClose={onClose}
            formId="banner-form"
            onSubmit={handleSubmit(onSubmit)}
            isSubmitting={submitMutation.isPending}
            cancelLabel={t('form.cancel')}
            submitLabel={t('form.submit')}
        >
            <FormSection icon="photo" title={t('sections.details.title')} description={t('sections.details.desc')}>
                <ImageDropzone
                    register={register}
                    watch={watch}
                    currentImage={isEditMode ? bannerToEdit?.image : null}
                    label={t('form.image')}
                    uploadText={t('form.upload_image')}
                    changeText={t('form.change_image')}
                />

                <div>
                    <label className={LABEL_CLASS}>{t('form.link')}</label>
                    <input
                        {...register('link')}
                        dir="ltr"
                        placeholder={t('form.link_placeholder')}
                        className={`${INPUT_CLASS} text-left ${errors.link ? 'border-red-500' : ''}`}
                    />
                    <ErrorMsg name="link" />
                </div>

                <div>
                    <label className={LABEL_CLASS}>{t('form.status')}</label>
                    <OptionCards
                        value={statusValue}
                        onChange={(v) => setValue('status', v, { shouldValidate: true })}
                        options={[
                            { value: 'active', label: t('status.active'), dot: 'bg-green-500' },
                            { value: 'inactive', label: t('status.inactive'), dot: 'bg-gray-400' },
                        ]}
                    />
                </div>
            </FormSection>
        </FullScreenFormModal>
    );
}
