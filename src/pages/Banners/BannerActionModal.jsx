import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FullScreenFormModal from '../../components/form/FullScreenFormModal';
import { INPUT_CLASS, LABEL_CLASS, OptionCards, ImageDropzone, FormSection, SelectField } from '../../components/form/FormKit';

export default function BannerActionModal({ bannerToEdit, onClose }) {
    const { t } = useTranslation('banners');
    const queryClient = useQueryClient();
    const isEditMode = !!bannerToEdit;

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

    useEffect(() => {
        if (isEditMode && bannerToEdit) {
            reset({
                title_en: bannerToEdit.title_en || '',
                title_ar: bannerToEdit.title_ar || '',
                status: bannerToEdit.status || 'active',
            });
        }
    }, [bannerToEdit, isEditMode, reset]);

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
                
                {/* Titles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('form.title_en')}</label>
                        <input
                            {...register('title_en')}
                            className={`${INPUT_CLASS} ${errors.title_en ? 'border-red-500' : ''}`}
                        />
                        <ErrorMsg name="title_en" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('form.title_ar')}</label>
                        <input
                            {...register('title_ar')}
                            className={`${INPUT_CLASS} ${errors.title_ar ? 'border-red-500' : ''}`}
                        />
                        <ErrorMsg name="title_ar" />
                    </div>
                </div>



                {/* Image */}
                <ImageDropzone
                    register={register}
                    watch={watch}
                    currentImage={isEditMode ? bannerToEdit?.image : null}
                    label={t('form.image')}
                    uploadText={t('form.upload_image')}
                    changeText={t('form.change_image')}
                />

                {/* Status Selection */}
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
