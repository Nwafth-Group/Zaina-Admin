import React, { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FullScreenFormModal from '../../components/form/FullScreenFormModal';
import { INPUT_CLASS, LABEL_CLASS, SelectField, OptionCards, FormSection } from '../../components/form/FormKit';

export default function AreaActionModal({ areaToEdit, onClose }) {
    const { t, i18n } = useTranslation('locations');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();
    const isEdit = !!areaToEdit;
    const nameOf = (o) => (isArabic ? o.name_ar : o.name_en);

    const schema = yup.object().shape({
        city_id: yup.string().required(t('common.required')),
        name_ar: yup.string().required(t('common.required')),
        name_en: yup.string().required(t('common.required')),
        code: yup.string().required(t('common.required')),
        status: yup.string().required(t('common.required')),
    });

    const { register, handleSubmit, reset, watch, setValue, setError, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { city_id: '', name_ar: '', name_en: '', code: '', status: 'active' },
    });
    const statusValue = watch('status');

    const { data: cities = [] } = useQuery({
        queryKey: ['cities'],
        queryFn: async () => (await axiosInstance.get('/admin/cities')).data.data.items || [],
    });

    useEffect(() => {
        if (isEdit && areaToEdit) {
            reset({
                city_id: areaToEdit.city_id ? String(areaToEdit.city_id) : '',
                name_ar: areaToEdit.name_ar || '',
                name_en: areaToEdit.name_en || '',
                code: areaToEdit.code || '',
                status: areaToEdit.status || 'active',
            });
        }
    }, [areaToEdit, isEdit, reset]);

    const submit = useMutation({
        mutationFn: async (data) => {
            const url = isEdit ? `/admin/areas/${areaToEdit.id}` : '/admin/areas';
            return isEdit ? axiosInstance.put(url, data) : axiosInstance.post(url, data);
        },
        onSuccess: (res) => {
            toast.success(res.data?.message || t('common.saved'));
            queryClient.invalidateQueries({ queryKey: ['areas'] });
            onClose();
        },
        onError: (error) => {
            const validationErrors = error.response?.data?.errors || error.response?.data?.params;
            if (validationErrors) {
                Object.entries(validationErrors).forEach(([key, messages]) => {
                    const message = Array.isArray(messages) ? messages[0] : messages;
                    setError(key, { type: 'server', message });
                });

                const firstErrKey = Object.keys(validationErrors)[0];
                const firstErrMsg = validationErrors[firstErrKey];
                const message = Array.isArray(firstErrMsg) ? firstErrMsg[0] : firstErrMsg;
                toast.error(message || t('common.error'));
            } else {
                toast.error(error.response?.data?.message || t('common.error'));
            }
        },
    });

    const Err = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    return (
        <FullScreenFormModal
            title={isEdit ? t('areas.form.edit_title') : t('areas.form.add_title')}
            onClose={onClose}
            formId="area-form"
            onSubmit={handleSubmit((d) => submit.mutate(d))}
            isSubmitting={submit.isPending}
            cancelLabel={t('common.cancel')}
            submitLabel={t('common.save')}
        >
            <FormSection icon="location" title={t('areas.title')} description={t('areas.subtitle')}>
                <div>
                    <label className={LABEL_CLASS}>{t('areas.form.city')}</label>
                    <SelectField registration={register('city_id')} className={errors.city_id ? 'border-red-500' : ''}>
                        <option value="">— {t('common.select')} —</option>
                        {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                                {nameOf(c)}{c.country ? ` — ${nameOf(c.country)}` : ''}
                            </option>
                        ))}
                    </SelectField>
                    <Err name="city_id" />
                </div>

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

                <div>
                    <label className={LABEL_CLASS}>{t('common.code')}</label>
                    <input {...register('code')} dir="ltr" placeholder="NASR-01" className={`${INPUT_CLASS} ${errors.code ? 'border-red-500' : ''}`} />
                    <Err name="code" />
                </div>

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
