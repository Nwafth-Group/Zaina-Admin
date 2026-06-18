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

export default function CountryActionModal({ countryToEdit, onClose }) {
    const { t } = useTranslation('locations');
    const queryClient = useQueryClient();
    const isEdit = !!countryToEdit;

    const schema = yup.object().shape({
        name_ar: yup.string().required(t('common.required')),
        name_en: yup.string().required(t('common.required')),
        code: yup.string().required(t('common.required')),
        currency_code: yup.string().required(t('common.required')),
        phone_code: yup.string().nullable(),
        status: yup.string().required(t('common.required')),
    });

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { name_ar: '', name_en: '', code: '', currency_code: '', phone_code: '', status: 'active' },
    });
    const statusValue = watch('status');

    useEffect(() => {
        if (isEdit && countryToEdit) {
            reset({
                name_ar: countryToEdit.name_ar || '',
                name_en: countryToEdit.name_en || '',
                code: countryToEdit.code || '',
                currency_code: countryToEdit.currency_code || '',
                phone_code: countryToEdit.phone_code || '',
                status: countryToEdit.status || 'active',
            });
        }
    }, [countryToEdit, isEdit, reset]);

    const submit = useMutation({
        mutationFn: async (data) => {
            const payload = new FormData();
            if (isEdit) payload.append('_method', 'PUT');
            payload.append('name_ar', data.name_ar);
            payload.append('name_en', data.name_en);
            payload.append('code', data.code);
            payload.append('currency_code', data.currency_code || '');
            payload.append('phone_code', data.phone_code || '');
            payload.append('status', data.status);
            if (data.flag && data.flag[0]) payload.append('flag', data.flag[0]);

            const url = isEdit ? `/admin/countries/${countryToEdit.id}` : '/admin/countries';
            return axiosInstance.post(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: (res) => {
            toast.success(res.data?.message || t('common.saved'));
            queryClient.invalidateQueries({ queryKey: ['countries'] });
            onClose();
        },
        onError: (error) => {
            const params = error.response?.data?.params;
            if (params) toast.error(Object.values(params)[0]);
            else toast.error(error.response?.data?.message || t('common.error'));
        },
    });

    const Err = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    return (
        <FullScreenFormModal
            title={isEdit ? t('countries.form.edit_title') : t('countries.form.add_title')}
            onClose={onClose}
            formId="country-form"
            onSubmit={handleSubmit((d) => submit.mutate(d))}
            isSubmitting={submit.isPending}
            cancelLabel={t('common.cancel')}
            submitLabel={t('common.save')}
        >
            <FormSection icon="location" title={t('countries.title')} description={t('countries.subtitle')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('common.name_ar')}</label>
                        <input {...register('name_ar')} dir="rtl" className={`${INPUT_CLASS} ${errors.name_ar ? 'border-red-500' : ''}`} />
                        <Err name="name_ar" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('common.name_en')}</label>
                        <input {...register('name_en')} dir="ltr" className={`${INPUT_CLASS} ${errors.name_en ? 'border-red-500' : ''}`} />
                        <Err name="name_en" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('common.code')}</label>
                        <input {...register('code')} dir="ltr" placeholder="EG" className={`${INPUT_CLASS} ${errors.code ? 'border-red-500' : ''}`} />
                        <Err name="code" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('countries.form.currency_code')}</label>
                        <input {...register('currency_code')} dir="ltr" placeholder="EGP" className={`${INPUT_CLASS} ${errors.currency_code ? 'border-red-500' : ''}`} />
                        <Err name="currency_code" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('countries.form.phone_code')}</label>
                        <input {...register('phone_code')} dir="ltr" placeholder="+20" className={`${INPUT_CLASS} ${errors.phone_code ? 'border-red-500' : ''}`} />
                        <Err name="phone_code" />
                    </div>
                </div>

                <ImageDropzone
                    register={register}
                    watch={watch}
                    name="flag"
                    currentImage={isEdit ? countryToEdit?.flag : null}
                    label={t('countries.form.flag')}
                    uploadText={t('countries.form.upload')}
                    changeText={t('countries.form.change')}
                />

                <div>
                    <label className={LABEL_CLASS}>{t('common.status')}</label>
                    <OptionCards
                        value={statusValue}
                        onChange={(v) => setValue('status', v, { shouldValidate: true })}
                        options={[
                            { value: 'active', label: t('common.active'), dot: 'bg-green-500' },
                            { value: 'inactive', label: t('common.inactive'), dot: 'bg-gray-400' },
                        ]}
                    />
                </div>
            </FormSection>
        </FullScreenFormModal>
    );
}
