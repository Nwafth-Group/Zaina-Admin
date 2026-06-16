import React, { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FullScreenFormModal from '../../components/form/FullScreenFormModal';
import { INPUT_CLASS, LABEL_CLASS, OptionCards, ImageDropzone, FormSection } from '../../components/form/FormKit';

export default function WorkerActionModal({ workerToEdit, onClose }) {
    const { t, i18n } = useTranslation('workers');
    const queryClient = useQueryClient();
    const isEditMode = !!workerToEdit;
    const isArabic = i18n.language?.startsWith('ar');

    const { data: servicesList, isLoading: isServicesLoading } = useQuery({
        queryKey: ['servicesList'],
        queryFn: async () => (await axiosInstance.get('/admin/services')).data.data.items || [],
    });

    const { data: fullWorkerData, isLoading: isWorkerLoading } = useQuery({
        queryKey: ['workerDetails', workerToEdit?.id],
        queryFn: async () => (await axiosInstance.get(`/admin/workers/${workerToEdit.id}`)).data.data,
        enabled: isEditMode,
    });

    const schema = yup.object().shape({
        name: yup.string().required(t('validation.required')),
        nationality: yup.string().required(t('validation.required')),
        status: yup.string().required(t('validation.required')),
    });

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { status: 'active', services: [] },
    });

    const statusValue = watch('status');

    useEffect(() => {
        if (isEditMode && fullWorkerData) {
            reset({
                name: fullWorkerData.name || '',
                nationality: fullWorkerData.nationality || '',
                status: fullWorkerData.status || 'active',
                services: fullWorkerData.services?.map((s) => String(s.id)) || [],
            });
        }
    }, [fullWorkerData, isEditMode, reset]);

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const payload = new FormData();
            if (isEditMode) payload.append('_method', 'PUT');
            payload.append('name', data.name);
            payload.append('nationality', data.nationality);
            payload.append('status', data.status);
            if (data.image && data.image[0]) payload.append('image', data.image[0]);
            (data.services || []).forEach((id) => payload.append('services[]', id));

            const url = isEditMode ? `/admin/workers/${workerToEdit.id}` : '/admin/workers';
            return axiosInstance.post(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || 'تم حفظ بيانات العامل بنجاح');
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء الحفظ.');
        },
    });

    const onSubmit = (data) => submitMutation.mutate(data);
    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    return (
        <FullScreenFormModal
            title={isEditMode ? t('form.title_edit') : t('form.title_add')}
            onClose={onClose}
            formId="worker-form"
            onSubmit={handleSubmit(onSubmit)}
            isLoading={isEditMode && isWorkerLoading}
            isSubmitting={submitMutation.isPending}
            cancelLabel={t('form.cancel')}
            submitLabel={t('form.submit')}
        >
            {/* Basic info */}
            <FormSection icon="user" title={t('sections.details.title')} description={t('sections.details.desc')}>
                <div>
                    <label className={LABEL_CLASS}>{t('form.name')}</label>
                    <input {...register('name')} className={`${INPUT_CLASS} ${errors.name ? 'border-red-500' : ''}`} />
                    <ErrorMsg name="name" />
                </div>
                <div>
                    <label className={LABEL_CLASS}>{t('form.nationality')}</label>
                    <input {...register('nationality')} className={`${INPUT_CLASS} ${errors.nationality ? 'border-red-500' : ''}`} />
                    <ErrorMsg name="nationality" />
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
                <ImageDropzone
                    register={register}
                    watch={watch}
                    currentImage={isEditMode ? fullWorkerData?.image : null}
                    label={t('form.image')}
                    uploadText={t('form.upload_image')}
                    changeText={t('form.change_image')}
                />
            </FormSection>

            {/* Linked services */}
            <FormSection icon="briefcase" title={t('sections.services.title')} description={t('sections.services.desc')}>
                <div className="flex flex-col gap-2 border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto bg-gray-50">
                    {isServicesLoading ? (
                        <span className="text-sm text-gray-500">{t('loading')}</span>
                    ) : (servicesList || []).length === 0 ? (
                        <span className="text-sm text-gray-500">{t('no_data')}</span>
                    ) : (
                        servicesList.map((service) => (
                            <label key={service.id} className="flex items-center gap-2 cursor-pointer bg-white p-2.5 border border-gray-100 rounded hover:bg-[#FDF0F3] transition-colors">
                                <input type="checkbox" value={String(service.id)} {...register('services')} className="w-4 h-4 text-[#E91E63] rounded focus:ring-[#E91E63]" />
                                <span className="text-sm text-gray-700">{isArabic ? service.name_ar : service.name_en}</span>
                            </label>
                        ))
                    )}
                </div>
            </FormSection>
        </FullScreenFormModal>
    );
}
