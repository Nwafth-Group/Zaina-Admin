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

export default function CityActionModal({ cityToEdit, onClose }) {
    const { t, i18n } = useTranslation('locations');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();
    const isEdit = !!cityToEdit;
    const nameOf = (o) => (isArabic ? o.name_ar : o.name_en);

    const schema = yup.object().shape({
        country_id: yup.string().required(t('common.required')),
        govrenrate_id: yup.string().required(t('common.required')),
        name_ar: yup.string().required(t('common.required')),
        name_en: yup.string().required(t('common.required')),
        code: yup.string().required(t('common.required')),
        status: yup.string().required(t('common.required')),
    });

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { country_id: '', govrenrate_id: '', name_ar: '', name_en: '', code: '', status: 'active' },
    });
    const countryId = watch('country_id');
    const statusValue = watch('status');

    const { data: countries = [] } = useQuery({
        queryKey: ['countries'],
        queryFn: async () => (await axiosInstance.get('/admin/countries')).data.data.items || [],
    });

    const { data: governorates = [], isLoading: govLoading } = useQuery({
        queryKey: ['govrenrates', countryId],
        queryFn: async () => (await axiosInstance.get(`/admin/govrenrates?country_id=${countryId}`)).data.data.items || [],
        enabled: !!countryId,
    });

    useEffect(() => {
        if (isEdit && cityToEdit) {
            reset({
                country_id: cityToEdit.country?.id ? String(cityToEdit.country.id) : '',
                govrenrate_id: cityToEdit.govrenrate_id ? String(cityToEdit.govrenrate_id) : '',
                name_ar: cityToEdit.name_ar || '',
                name_en: cityToEdit.name_en || '',
                code: cityToEdit.code || '',
                status: cityToEdit.status || 'active',
            });
        }
    }, [cityToEdit, isEdit, reset]);

    const submit = useMutation({
        mutationFn: async (data) => {
            const payload = {
                govrenrate_id: data.govrenrate_id,
                name_ar: data.name_ar,
                name_en: data.name_en,
                code: data.code,
                status: data.status,
            };
            const url = isEdit ? `/admin/cities/${cityToEdit.id}` : '/admin/cities';
            return isEdit ? axiosInstance.put(url, payload) : axiosInstance.post(url, payload);
        },
        onSuccess: (res) => {
            toast.success(res.data?.message || t('common.saved'));
            queryClient.invalidateQueries({ queryKey: ['cities'] });
            onClose();
        },
        onError: (error) => {
            const params = error.response?.data?.params;
            if (params) toast.error(Object.values(params)[0]);
            else toast.error(error.response?.data?.message || t('common.error'));
        },
    });

    // Changing the country clears the chosen governorate (it belongs to the old one).
    const countryReg = register('country_id');
    const onCountryChange = (e) => { countryReg.onChange(e); setValue('govrenrate_id', ''); };

    const Err = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    return (
        <FullScreenFormModal
            title={isEdit ? t('cities.form.edit_title') : t('cities.form.add_title')}
            onClose={onClose}
            formId="city-form"
            onSubmit={handleSubmit((d) => submit.mutate(d))}
            isSubmitting={submit.isPending}
            cancelLabel={t('common.cancel')}
            submitLabel={t('common.save')}
        >
            <FormSection icon="location" title={t('cities.title')} description={t('cities.subtitle')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('cities.form.country')}</label>
                        <SelectField registration={{ ...countryReg, onChange: onCountryChange }} className={errors.country_id ? 'border-red-500' : ''}>
                            <option value="">— {t('common.select')} —</option>
                            {countries.map((c) => <option key={c.id} value={c.id}>{nameOf(c)}</option>)}
                        </SelectField>
                        <Err name="country_id" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('cities.form.governorate')}</label>
                        <SelectField registration={register('govrenrate_id')} disabled={!countryId || govLoading} className={errors.govrenrate_id ? 'border-red-500' : ''}>
                            <option value="">{!countryId ? `— ${t('cities.form.select_country')} —` : govLoading ? `${t('common.loading')}` : `— ${t('common.select')} —`}</option>
                            {governorates.map((g) => <option key={g.id} value={g.id}>{nameOf(g)}</option>)}
                        </SelectField>
                        <Err name="govrenrate_id" />
                    </div>
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
                    <input {...register('code')} dir="ltr" placeholder="CAI-NASR" className={`${INPUT_CLASS} ${errors.code ? 'border-red-500' : ''}`} />
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
