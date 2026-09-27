import React, { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FullScreenFormModal from '../../components/form/FullScreenFormModal';
import { INPUT_CLASS, LABEL_CLASS, OptionCards, ImageDropzone, FormSection, SelectField } from '../../components/form/FormKit';
const ARAB_COUNTRIES = [
    { code: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', nameEn: 'Saudi Arabia' },
    { code: 'Egypt', nameAr: 'جمهورية مصر العربية', nameEn: 'Egypt' },
    { code: 'Jordan', nameAr: 'الأردن', nameEn: 'Jordan' },
    { code: 'Syria', nameAr: 'سوريا', nameEn: 'Syria' },
    { code: 'Lebanon', nameAr: 'لبنان', nameEn: 'Lebanon' },
    { code: 'Palestine', nameAr: 'فلسطين', nameEn: 'Palestine' },
    { code: 'Iraq', nameAr: 'العراق', nameEn: 'Iraq' },
    { code: 'Kuwait', nameAr: 'الكويت', nameEn: 'Kuwait' },
    { code: 'UAE', nameAr: 'الإمارات العربية المتحدة', nameEn: 'United Arab Emirates' },
    { code: 'Qatar', nameAr: 'قطر', nameEn: 'Qatar' },
    { code: 'Bahrain', nameAr: 'البحرين', nameEn: 'Bahrain' },
    { code: 'Oman', nameAr: 'عمان', nameEn: 'Oman' },
    { code: 'Yemen', nameAr: 'اليمن', nameEn: 'Yemen' },
    { code: 'Sudan', nameAr: 'السودان', nameEn: 'Sudan' },
    { code: 'Libya', nameAr: 'ليبيا', nameEn: 'Libya' },
    { code: 'Tunisia', nameAr: 'تونس', nameEn: 'Tunisia' },
    { code: 'Algeria', nameAr: 'الجزائر', nameEn: 'Algeria' },
    { code: 'Morocco', nameAr: 'المغرب', nameEn: 'Morocco' },
    { code: 'Mauritania', nameAr: 'موريتانيا', nameEn: 'Mauritania' },
    { code: 'Somalia', nameAr: 'الصومال', nameEn: 'Somalia' },
    { code: 'Djibouti', nameAr: 'جيبوتي', nameEn: 'Djibouti' },
    { code: 'Comoros', nameAr: 'جزر القمر', nameEn: 'Comoros' },
];

export default function WorkerActionModal({ workerToEdit, onClose }) {
    const { t, i18n } = useTranslation('workers');
    const queryClient = useQueryClient();
    const isEditMode = !!workerToEdit;
    const isArabic = i18n.language?.startsWith('ar');

    // Fetch services list
    const { data: servicesList, isLoading: isServicesLoading } = useQuery({
        queryKey: ['servicesList'],
        queryFn: async () => (await axiosInstance.get('/admin/services?per_page=100')).data.data.items || [],
    });

    // Fetch active teams list
    const { data: teamsList = [] } = useQuery({
        queryKey: ['activeTeamsList'],
        queryFn: async () => (await axiosInstance.get('/admin/teams?status=active')).data?.data?.items || [],
    });

    // Fetch full worker details for editing
    const { data: fullWorkerData, isLoading: isWorkerLoading } = useQuery({
        queryKey: ['workerDetails', workerToEdit?.id],
        queryFn: async () => (await axiosInstance.get(`/admin/workers/${workerToEdit.id}`)).data.data,
        enabled: isEditMode,
    });

    const schema = yup.object().shape({
        name: yup.string().required(t('validation.required')),
        phone_number: yup.string().required(t('validation.required')),
        nationality: yup.string().required(t('validation.required')),
        id_number: yup.string().required(t('validation.required')),
        address: yup.string().required(t('validation.required')),
        gender: yup.string().oneOf(['male', 'female']).required(t('validation.required')),
        status: yup.string().oneOf(['active', 'inactive', 'suspended']).required(t('validation.required')),
        team_id: yup.string().nullable().notRequired(),
        service_ids: yup.array().of(yup.string()).nullable().notRequired(),
    });

    const { register, handleSubmit, reset, watch, setValue, setError, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { 
            status: 'active', 
            gender: 'male',
            name: '',
            phone_number: '',
            nationality: '',
            id_number: '',
            address: '',
            team_id: '',
            service_ids: [],
        },
    });

    const statusValue = watch('status');
    const image = watch('image');
    const watchGender = watch('gender');
    const selectedServiceIds = watch('service_ids') || [];

    useEffect(() => {
        if (isEditMode && fullWorkerData) {
            const rawServices = fullWorkerData.assigned_services || fullWorkerData.services || [];
            reset({
                name: fullWorkerData.name || '',
                phone_number: fullWorkerData.phone_number || '',
                nationality: fullWorkerData.nationality || '',
                id_number: fullWorkerData.id_number || '',
                address: fullWorkerData.address || '',
                gender: fullWorkerData.gender || 'male',
                status: fullWorkerData.status || 'active',
                team_id: fullWorkerData.team_id ? String(fullWorkerData.team_id) : (fullWorkerData.team?.id ? String(fullWorkerData.team.id) : ''),
                service_ids: rawServices.map((s) => String(s.id)),
            });
        }
    }, [fullWorkerData, isEditMode, reset]);

    const handleServiceToggle = (service) => {
        const sId = String(service.id);
        const isSpecialized = service.is_team_based || (Number(service.id) >= 6 && Number(service.id) <= 11);

        if (!isSpecialized) {
            // Standard service (1-5): only single service allowed
            if (selectedServiceIds.includes(sId)) {
                setValue('service_ids', [], { shouldValidate: true });
            } else {
                setValue('service_ids', [sId], { shouldValidate: true });
            }
        } else {
            // Specialized service (6-11): multi-selection allowed among specialized services
            // Remove any standard services first
            const specializedSelected = selectedServiceIds.filter((id) => {
                const s = (servicesList || []).find((srv) => String(srv.id) === String(id));
                return s?.is_team_based || (Number(id) >= 6 && Number(id) <= 11);
            });

            const next = specializedSelected.includes(sId)
                ? specializedSelected.filter((id) => id !== sId)
                : [...specializedSelected, sId];
            setValue('service_ids', next, { shouldValidate: true });
        }
    };

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const payload = new FormData();
            payload.append('name', data.name);
            payload.append('phone_number', data.phone_number);
            payload.append('nationality', data.nationality);
            payload.append('id_number', data.id_number);
            payload.append('address', data.address);
            payload.append('gender', data.gender);
            payload.append('status', data.status);
            
            if (data.gender === 'male' && data.team_id) {
                payload.append('team_id', data.team_id);
            } else {
                payload.append('team_id', '');
            }

            if (isEditMode) {
                payload.append('_method', 'PUT');
            }

            if (image && image[0]) {
                payload.append('image', image[0]);
            }

            if (data.service_ids && data.service_ids.length > 0) {
                data.service_ids.forEach((id) => {
                    payload.append('services[]', id);
                });
            } else {
                payload.append('services', '');
            }

            const url = isEditMode ? `/admin/workers/${workerToEdit.id}` : '/admin/workers';
            return axiosInstance.post(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم حفظ بيانات العامل بنجاح' : 'Worker details saved successfully'));
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            onClose();
        },
        onError: (error) => {
            const validationErrors = error.response?.data?.errors || error.response?.data?.params;
            if (validationErrors) {
                Object.entries(validationErrors).forEach(([key, messages]) => {
                    const message = Array.isArray(messages) ? messages[0] : messages;
                    setError(key, { type: 'server', message });
                });
            }
            const errorMsg = error.response?.data?.message;
            toast.error(errorMsg || (isArabic ? 'يرجى التحقق من صحة البيانات المدخلة.' : 'Please check the entered information.'));
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('form.name')}</label>
                        <input {...register('name')} className={`${INPUT_CLASS} ${errors.name ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="name" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'رقم الهاتف' : 'Phone Number'}</label>
                        <input {...register('phone_number')} className={`${INPUT_CLASS} ${errors.phone_number ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="phone_number" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('form.nationality')}</label>
                        <SelectField registration={register('nationality')}>
                            <option value="">{isArabic ? 'اختر الجنسية' : 'Select nationality'}</option>
                            {ARAB_COUNTRIES.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {isArabic ? c.nameAr : c.nameEn}
                                </option>
                            ))}
                        </SelectField>
                        <ErrorMsg name="nationality" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'رقم الهوية' : 'ID Number'}</label>
                        <input {...register('id_number')} className={`${INPUT_CLASS} ${errors.id_number ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="id_number" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'الجنس' : 'Gender'}</label>
                        <SelectField registration={register('gender')}>
                            <option value="male">{isArabic ? 'ذكر' : 'Male'}</option>
                            <option value="female">{isArabic ? 'أنثى' : 'Female'}</option>
                        </SelectField>
                        <ErrorMsg name="gender" />
                    </div>
                </div>

                <div>
                    <label className={LABEL_CLASS}>{isArabic ? 'العنوان' : 'Address'}</label>
                    <textarea {...register('address')} rows="3" className={`${INPUT_CLASS} ${errors.address ? 'border-red-500' : ''}`} />
                    <ErrorMsg name="address" />
                </div>

                <div>
                    <label className={LABEL_CLASS}>{t('form.status')}</label>
                    <OptionCards
                        value={statusValue}
                        onChange={(v) => setValue('status', v, { shouldValidate: true })}
                        options={[
                            { value: 'active', label: t('status.active'), dot: 'bg-green-500' },
                            { value: 'inactive', label: t('status.inactive'), dot: 'bg-gray-400' },
                            { value: 'suspended', label: isArabic ? 'موقوف' : 'Suspended', dot: 'bg-red-500' },
                        ]}
                    />
                    <ErrorMsg name="status" />
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

            {/* Team Assignment (Male Workers Only) */}
            {watchGender === 'male' && (
                <FormSection
                    icon="users"
                    title={isArabic ? 'فريق العمل (خاص بالذكور)' : 'Work Team (Male Workers)'}
                    description={isArabic ? 'إسناد العامل لفريق عمل تشغيلي (العامل يتبع فريقاً واحداً فقط).' : 'Assign worker to an operational work team (1 worker -> 1 team).'}
                >
                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'فريق العمل' : 'Work Team'}</label>
                        <SelectField registration={register('team_id')}>
                            <option value="">-- {isArabic ? 'بدون فريق (غير مسند)' : 'No Team Assigned'} --</option>
                            {teamsList.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {isArabic ? team.name_ar : team.name_en || team.name_ar} ({team.code})
                                </option>
                            ))}
                        </SelectField>
                        <ErrorMsg name="team_id" />
                    </div>
                </FormSection>
            )}

            {/* Service Assignment */}
            <FormSection
                icon="briefcase"
                title={isArabic ? 'تعيين الخدمات' : 'Service Assignment'}
                description={
                    isArabic
                        ? 'الخدمات العادية (1-5): خدمة واحدة فقط. الخدمات التخصصية (6-11): يمكن اختيار أكثر من خدمة لنفس العامل.'
                        : 'Standard services (1-5): single service only. Specialized services (6-11): multi-service selection allowed.'
                }
            >
                <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                        {isServicesLoading ? (
                            <div className="col-span-2 text-center py-4 text-xs text-gray-400">{t('loading')}</div>
                        ) : (servicesList || []).length === 0 ? (
                            <div className="col-span-2 text-center py-4 text-xs text-gray-400">{t('no_data')}</div>
                        ) : (
                            (servicesList || []).map((service) => {
                                const sId = String(service.id);
                                const isSelected = selectedServiceIds.includes(sId);
                                const isSpecialized = service.is_team_based || (Number(service.id) >= 6 && Number(service.id) <= 11);

                                return (
                                    <div
                                        key={service.id}
                                        onClick={() => handleServiceToggle(service)}
                                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-pink-50/70 border-[#E91E63] shadow-xs'
                                                : 'bg-white border-gray-100 hover:border-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                className="w-4 h-4 text-[#E91E63] rounded border-gray-300 focus:ring-[#E91E63]"
                                            />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-800 truncate">
                                                    {isArabic ? service.name_ar : service.name_en || service.name_ar}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-mono truncate">
                                                    {service.service_code || `SVC-${service.id}`}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                                isSpecialized
                                                    ? 'bg-purple-50 text-purple-600'
                                                    : 'bg-blue-50 text-blue-600'
                                            }`}
                                        >
                                            {isSpecialized ? (isArabic ? 'تخصصية (6-11)' : 'Specialized') : (isArabic ? 'عادية (1-5)' : 'Standard')}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <ErrorMsg name="services" />
                    <ErrorMsg name="service_ids" />
                </div>
            </FormSection>
        </FullScreenFormModal>
    );
}
