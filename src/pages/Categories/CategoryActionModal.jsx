import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FullScreenFormModal from '../../components/form/FullScreenFormModal';
import { INPUT_CLASS, LABEL_CLASS, SelectField, OptionCards, ImageDropzone, FormSection } from '../../components/form/FormKit';

export default function CategoryActionModal({ categoryToEdit, mainCategories, onClose, onSuccess }) {
    const { t, i18n } = useTranslation('categories');
    const queryClient = useQueryClient();
    const isEditMode = !!categoryToEdit;
    const isArabic = i18n.language?.startsWith('ar');

    const schema = yup.object().shape({
        name_ar: yup.string().required(t('action_modal.validation_required')),
        name_en: yup.string().required(t('action_modal.validation_required')),
        status: yup.string().required(t('action_modal.validation_required')),
        parent_id: yup.string().nullable(),
    });

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { status: 'active', parent_id: '' },
    });

    const statusValue = watch('status');

    useEffect(() => {
        if (categoryToEdit && isEditMode) {
            reset({
                name_ar: categoryToEdit.name_ar || '',
                name_en: categoryToEdit.name_en || '',
                status: categoryToEdit.status || 'active',
                parent_id: categoryToEdit.parent?.id ? String(categoryToEdit.parent.id) : '',
            });
        }
    }, [categoryToEdit, isEditMode, reset]);

    const submitMutation = useMutation({
        mutationFn: async (formData) => {
            const payload = new FormData();
            payload.append('name_ar', formData.name_ar);
            payload.append('name_en', formData.name_en);
            payload.append('status', formData.status);
            if (formData.parent_id) payload.append('parent_id', formData.parent_id);
            if (formData.image && formData.image[0]) payload.append('image', formData.image[0]);

            if (isEditMode) {
                payload.append('_method', 'PUT');
                return axiosInstance.post(`/admin/categories/${categoryToEdit.id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            return axiosInstance.post('/admin/categories', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: (response) => {
            toast.success(response.data.message || 'تمت العملية بنجاح');
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['main-categories'] });
            onSuccess?.();
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء حفظ البيانات.');
        },
    });

    const onSubmit = (data) => submitMutation.mutate(data);
    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    return (
        <FullScreenFormModal
            title={isEditMode ? t('action_modal.title_edit') : t('action_modal.title_add')}
            onClose={onClose}
            formId="category-form"
            onSubmit={handleSubmit(onSubmit)}
            isSubmitting={submitMutation.isPending}
            cancelLabel={t('action_modal.cancel')}
            submitLabel={t('action_modal.submit')}
        >
            <FormSection icon="tag" title={t('sections.identity.title')} description={t('sections.identity.desc')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('action_modal.name_ar')}</label>
                        <input {...register('name_ar')} dir="rtl" className={`${INPUT_CLASS} ${errors.name_ar ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="name_ar" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('action_modal.name_en')}</label>
                        <input {...register('name_en')} dir="ltr" className={`${INPUT_CLASS} ${errors.name_en ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="name_en" />
                    </div>
                </div>
            </FormSection>

            <FormSection icon="settings" title={t('sections.settings.title')} description={t('sections.settings.desc')}>
                <div>
                    <label className={LABEL_CLASS}>{t('action_modal.parent_category')}</label>
                    <SelectField registration={register('parent_id')}>
                        <option value="">-- {t('action_modal.none')} --</option>
                        {mainCategories.map((cat) => (
                            cat.id !== categoryToEdit?.id && (
                                <option key={cat.id} value={cat.id}>{isArabic ? cat.name_ar : cat.name_en}</option>
                            )
                        ))}
                    </SelectField>
                </div>

                <div>
                    <label className={LABEL_CLASS}>{t('action_modal.status')}</label>
                    <OptionCards
                        value={statusValue}
                        onChange={(v) => setValue('status', v, { shouldValidate: true })}
                        options={[
                            { value: 'active', label: t('status.active'), dot: 'bg-green-500' },
                            { value: 'inactive', label: t('status.inactive'), dot: 'bg-gray-400' },
                        ]}
                    />
                </div>

                <ImageDropzone
                    register={register}
                    watch={watch}
                    currentImage={isEditMode ? categoryToEdit?.image : null}
                    label={t('action_modal.image')}
                    uploadText={t('action_modal.upload_image')}
                    changeText={t('action_modal.change_image')}
                />
            </FormSection>
        </FullScreenFormModal>
    );
}
