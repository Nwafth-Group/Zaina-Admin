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

export default function GovernorateActionModal({ governorateToEdit, onClose }) {
    const { t, i18n } = useTranslation('locations');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();
    const isEdit = !!governorateToEdit;
    const nameOf = (o) => (isArabic ? o.name_ar : o.name_en);

    const schema = yup.object().shape({
        country_id: yup.string().required(t('common.required')),
        name_ar: yup.string().required(t('common.required')),
        name_en: yup.string().required(t('common.required')),
        status: yup.string().required(t('common.required')),
    });

    const { register, handleSubmit, reset, watch, setValue, setError, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { country_id: '', name_ar: '', name_en: '', status: 'active' },
    });
    const statusValue = watch('status');

    const { data: countries = [] } = useQuery({
        queryKey: ['countries'],
        queryFn: async () => (await axiosInstance.get('/admin/countries')).data.data.items || [],
    });

    useEffect(() => {
        if (isEdit && governorateToEdit) {
            reset({
                country_id: governorateToEdit.country?.id ? String(governorateToEdit.country.id) : (governorateToEdit.country_id ? String(governorateToEdit.country_id) : ''),
                name_ar: governorateToEdit.name_ar || '',
                name_en: governorateToEdit.name_en || '',
                status: governorateToEdit.status || 'active',
            });
        }
    }, [governorateToEdit, isEdit, reset]);

    const submit = useMutation({
        mutationFn: async (data) => {
            const payload = {
                country_id: Number(data.country_id),
                name_ar: data.name_ar,
                name_en: data.name_en,
                status: data.status,
            };
            const url = isEdit ? `/admin/govrenrates/${governorateToEdit.id}` : '/admin/govrenrates';
            return isEdit ? axiosInstance.put(url, payload) : axiosInstance.post(url, payload);
        },
        onSuccess: () => {
            toast.success(isEdit ? (isArabic ? 'تم تحديث المحافظة بنجاح' : 'Governorate updated successfully') : (isArabic ? 'تم إضافة المحافظة بنجاح' : 'Governorate created successfully'));
            queryClient.invalidateQueries({ queryKey: ['govrenrates'] });
            onClose();
        },
        onError: (e) => {
            const resErrors = e.response?.data?.errors;
            if (resErrors) {
                Object.entries(resErrors).forEach(([field, msgs]) => {
                    setError(field, { type: 'manual', message: Array.isArray(msgs) ? msgs[0] : msgs });
                });
            } else {
                toast.error(e.response?.data?.message || t('common.error'));
            }
        },
    });

    const title = isEdit
        ? (isArabic ? `تعديل محافظة: ${nameOf(governorateToEdit)}` : `Edit Governorate: ${nameOf(governorateToEdit)}`)
        : (isArabic ? 'إضافة محافظة جديدة' : 'Add New Governorate');

    return (
        <FullScreenFormModal title={title} onClose={onClose}>
            <form id="governorate-form" onSubmit={handleSubmit((d) => submit.mutate(d))} className="space-y-6">
                <FormSection title={isArabic ? 'المعلومات الأساسية' : 'Basic Information'}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SelectField
                            label={isArabic ? 'الدولة' : 'Country'}
                            error={errors.country_id?.message}
                            required
                            {...register('country_id')}
                        >
                            <option value="">{isArabic ? 'اختر الدولة...' : 'Select country...'}</option>
                            {countries.map((c) => (
                                <option key={c.id} value={c.id}>{nameOf(c)}</option>
                            ))}
                        </SelectField>

                        <div></div>

                        <div>
                            <label className={LABEL_CLASS}>{isArabic ? 'اسم المحافظة (بالعربية)' : 'Governorate Name (Arabic)'} *</label>
                            <input type="text" {...register('name_ar')} placeholder="مثال: محافظة العاصمة" className={INPUT_CLASS(errors.name_ar)} />
                            {errors.name_ar && <p className="text-xs text-red-500 mt-1">{errors.name_ar.message}</p>}
                        </div>

                        <div>
                            <label className={LABEL_CLASS}>{isArabic ? 'اسم المحافظة (بالإنجليزية)' : 'Governorate Name (English)'} *</label>
                            <input type="text" {...register('name_en')} placeholder="e.g. Capital Governorate" className={INPUT_CLASS(errors.name_en)} />
                            {errors.name_en && <p className="text-xs text-red-500 mt-1">{errors.name_en.message}</p>}
                        </div>
                    </div>
                </FormSection>

                <FormSection title={isArabic ? 'الحالة' : 'Status'}>
                    <OptionCards
                        name="status"
                        value={statusValue}
                        onChange={(val) => setValue('status', val, { shouldValidate: true })}
                        options={[
                            { value: 'active', label: isArabic ? 'نشط' : 'Active', desc: isArabic ? 'تكون المحافظة متاحة ومفعلة للنظام' : 'Governorate is active and available' },
                            { value: 'inactive', label: isArabic ? 'غير نشط' : 'Inactive', desc: isArabic ? 'تعطيل المحافظة مؤقتاً' : 'Temporarily disable governorate' },
                        ]}
                    />
                </FormSection>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
                    >
                        {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                        type="submit"
                        disabled={submit.isPending}
                        className="px-6 py-2.5 rounded-xl bg-[#E91E63] text-white text-xs font-bold hover:bg-[#d81b58] transition shadow-sm disabled:opacity-50"
                    >
                        {submit.isPending
                            ? (isArabic ? 'جاري الحفظ...' : 'Saving...')
                            : (isEdit ? (isArabic ? 'حفظ التعديلات' : 'Save Changes') : (isArabic ? 'إضافة المحافظة' : 'Add Governorate'))}
                    </button>
                </div>
            </form>
        </FullScreenFormModal>
    );
}
