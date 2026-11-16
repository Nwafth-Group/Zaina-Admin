import React, { useState, useEffect, useMemo } from 'react';
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
    { code: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', nameEn: 'Saudi Arabia', phoneCode: '+966', digits: 9, flag: '🇸🇦', sample: '5XXXXXXXX' },
    { code: 'Egypt', nameAr: 'جمهورية مصر العربية', nameEn: 'Egypt', phoneCode: '+20', digits: 10, flag: '🇪🇬', sample: '10XXXXXXXX' },
    { code: 'UAE', nameAr: 'الإمارات العربية المتحدة', nameEn: 'United Arab Emirates', phoneCode: '+971', digits: 9, flag: '🇦🇪', sample: '5XXXXXXXX' },
    { code: 'Jordan', nameAr: 'الأردن', nameEn: 'Jordan', phoneCode: '+962', digits: 9, flag: '🇯🇴', sample: '7XXXXXXXX' },
    { code: 'Kuwait', nameAr: 'الكويت', nameEn: 'Kuwait', phoneCode: '+965', digits: 8, flag: '🇰🇼', sample: 'XXXXXXXX' },
    { code: 'Qatar', nameAr: 'قطر', nameEn: 'Qatar', phoneCode: '+974', digits: 8, flag: '🇶🇦', sample: 'XXXXXXXX' },
    { code: 'Bahrain', nameAr: 'البحرين', nameEn: 'Bahrain', phoneCode: '+973', digits: 8, flag: '🇧🇭', sample: 'XXXXXXXX' },
    { code: 'Oman', nameAr: 'عمان', nameEn: 'Oman', phoneCode: '+968', digits: 8, flag: '🇴🇲', sample: 'XXXXXXXX' },
    { code: 'Palestine', nameAr: 'فلسطين', nameEn: 'Palestine', phoneCode: '+970', digits: 9, flag: '🇵🇸', sample: '5XXXXXXXX' },
    { code: 'Lebanon', nameAr: 'لبنان', nameEn: 'Lebanon', phoneCode: '+961', digits: 8, flag: '🇱🇧', sample: 'XXXXXXXX' },
    { code: 'Syria', nameAr: 'سوريا', nameEn: 'Syria', phoneCode: '+963', digits: 9, flag: '🇸🇾', sample: '9XXXXXXXX' },
    { code: 'Iraq', nameAr: 'العراق', nameEn: 'Iraq', phoneCode: '+964', digits: 10, flag: '🇮🇶', sample: '7XXXXXXXXX' },
    { code: 'Yemen', nameAr: 'اليمن', nameEn: 'Yemen', phoneCode: '+967', digits: 9, flag: '🇾🇪', sample: '7XXXXXXXX' },
    { code: 'Sudan', nameAr: 'السودان', nameEn: 'Sudan', phoneCode: '+249', digits: 9, flag: '🇸🇩', sample: '9XXXXXXXX' },
    { code: 'Libya', nameAr: 'ليبيا', nameEn: 'Libya', phoneCode: '+218', digits: 9, flag: '🇱🇾', sample: '9XXXXXXXX' },
    { code: 'Tunisia', nameAr: 'تونس', nameEn: 'Tunisia', phoneCode: '+216', digits: 8, flag: '🇹🇳', sample: 'XXXXXXXX' },
    { code: 'Algeria', nameAr: 'الجزائر', nameEn: 'Algeria', phoneCode: '+213', digits: 9, flag: '🇩🇿', sample: 'XXXXXXXXX' },
    { code: 'Morocco', nameAr: 'المغرب', nameEn: 'Morocco', phoneCode: '+212', digits: 9, flag: '🇲🇦', sample: '6XXXXXXXX' },
    { code: 'Mauritania', nameAr: 'موريتانيا', nameEn: 'Mauritania', phoneCode: '+222', digits: 8, flag: '🇲🇷', sample: 'XXXXXXXX' },
    { code: 'Somalia', nameAr: 'الصومال', nameEn: 'Somalia', phoneCode: '+252', digits: 9, flag: '🇸🇴', sample: 'XXXXXXXXX' },
    { code: 'Djibouti', nameAr: 'جيبوتي', nameEn: 'Djibouti', phoneCode: '+253', digits: 8, flag: '🇩🇯', sample: '77XXXXXX' },
    { code: 'Comoros', nameAr: 'جزر القمر', nameEn: 'Comoros', phoneCode: '+269', digits: 7, flag: '🇰🇲', sample: '3XXXXXX' },
];

export const DAYS_OF_WEEK = [
    { key: 'saturday', labelAr: 'السبت', labelEn: 'Saturday' },
    { key: 'sunday', labelAr: 'الأحد', labelEn: 'Sunday' },
    { key: 'monday', labelAr: 'الاثنين', labelEn: 'Monday' },
    { key: 'tuesday', labelAr: 'الثلاثاء', labelEn: 'Tuesday' },
    { key: 'wednesday', labelAr: 'الأربعاء', labelEn: 'Wednesday' },
    { key: 'thursday', labelAr: 'الخميس', labelEn: 'Thursday' },
    { key: 'friday', labelAr: 'الجمعة', labelEn: 'Friday' },
];

const parsePhone = (rawPhone, nationality) => {
    if (!rawPhone) return { phoneCode: '+966', mobile: '' };
    const str = String(rawPhone).trim();

    let normalized = str;
    if (normalized.startsWith('00')) {
        normalized = '+' + normalized.substring(2);
    }

    const sortedCountries = [...ARAB_COUNTRIES].sort((a, b) => b.phoneCode.length - a.phoneCode.length);
    for (const c of sortedCountries) {
        if (normalized.startsWith(c.phoneCode)) {
            let local = normalized.slice(c.phoneCode.length).replace(/\D/g, '');
            if (local.startsWith('0') && local.length === c.digits + 1) {
                local = local.slice(1);
            }
            return { phoneCode: c.phoneCode, mobile: local };
        }
    }

    const natCountry = ARAB_COUNTRIES.find((c) => c.code === nationality);
    const defaultCode = natCountry ? natCountry.phoneCode : '+966';
    const country = natCountry || ARAB_COUNTRIES.find((c) => c.phoneCode === defaultCode);
    let local = str.replace(/\D/g, '');
    if (country && local.startsWith('0') && local.length === country.digits + 1) {
        local = local.slice(1);
    }
    return { phoneCode: defaultCode, mobile: local };
};

export const isServiceAllowedForGender = (service, gender) => {
    if (!gender || !service) return true;
    const g = String(gender).toLowerCase();
    const code = (service.service_code || '').toUpperCase();
    const sId = Number(service.id);

    // Female-only services (1, 3, 4)
    if (['DOMESTIC_HELPER_HOURLY', 'BABYSITTER_HOURLY', 'PEDICURE_MANICURE'].includes(code) || [1, 3, 4].includes(sId)) {
        return g === 'female';
    }

    // Male-only services (5: Deep Cleaning, 6 to 11: Specialized / Team-based)
    if (code === 'DEEP_CLEANING' || sId === 5 || service.is_team_based || (sId >= 6 && sId <= 11) || [
        'SOFA_CLEANING', 'WATER_TANK_CLEANING', 'STAIRS_SURFACES_CLEANING', 'AC_CLEANING', 'CARPET_CLEANING', 'CAR_WASH'
    ].includes(code)) {
        return g === 'male';
    }

    // Hospitality or other services: check worker_gender_options
    const opts = service.worker_gender_options || [];
    if (Array.isArray(opts) && opts.length > 0) {
        return opts.map((x) => String(x).toLowerCase()).includes(g);
    }

    return true;
};

export default function WorkerActionModal({ workerToEdit, onClose, onSuccess }) {
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
        phone_code: yup.string().required(t('validation.required')),
        mobile_number: yup
            .string()
            .required(t('validation.required'))
            .test('valid-digits', function (value) {
                if (!value) return false;
                const { phone_code } = this.parent;
                const country = ARAB_COUNTRIES.find((c) => c.phoneCode === phone_code);
                const expectedDigits = country ? country.digits : 9;

                let digits = String(value).replace(/\D/g, '');
                if (digits.startsWith('0') && digits.length === expectedDigits + 1) {
                    digits = digits.substring(1);
                }

                if (digits.length !== expectedDigits) {
                    const countryName = country ? (isArabic ? country.nameAr : country.nameEn) : '';
                    return this.createError({
                        message: isArabic
                            ? `يجب أن يتكون رقم الجوال من ${expectedDigits} أرقام (${countryName})`
                            : `Mobile number must be ${expectedDigits} digits (${countryName})`,
                    });
                }
                return true;
            }),
        nationality: yup.string().required(t('validation.required')),
        id_number: yup.string().required(t('validation.required')),
        address: yup.string().required(t('validation.required')),
        gender: yup.string().oneOf(['male', 'female']).required(t('validation.required')),
        status: yup.string().oneOf(['active', 'inactive', 'suspended']).required(t('validation.required'))
            .test('not_assigned_if_inactive', isArabic ? 'لا يمكن تغيير حالة العامل إلى غير نشط لأنه مسند إلى خدمة. يرجى إلغاء تحديد الخدمات أولاً.' : 'Cannot deactivate worker because they are assigned to a service. Please unassign services first.', function(statusVal) {
                if (statusVal === 'active') return true;
                const { service_ids, team_id, gender } = this.parent || {};
                if (Array.isArray(service_ids) && service_ids.length > 0) {
                    return false;
                }
                if (gender === 'male' && team_id) {
                    const assignedTeam = (teamsList || []).find(t => String(t.id) === String(team_id));
                    if (assignedTeam && (assignedTeam.services_count > 0 || (Array.isArray(assignedTeam.services) && assignedTeam.services.length > 0))) {
                        return false;
                    }
                }
                return true;
            }),
        team_id: yup.string().nullable().notRequired(),
        work_days: yup.array().of(yup.string()).min(1, isArabic ? 'يجب اختيار يوم عمل واحد على الأقل للعامل' : 'Select at least one work day'),
        service_ids: yup.array().of(yup.string()).nullable().notRequired()
            .test('gender_matches_services', isArabic ? 'بعض الخدمات المحددة لا تتطابق مع جنس العامل' : 'Some selected services do not match worker gender', function(serviceIds) {
                if (!Array.isArray(serviceIds) || serviceIds.length === 0) return true;
                const { gender } = this.parent || {};
                if (!gender) return true;
                for (const sId of serviceIds) {
                    const s = (servicesList || []).find((srv) => String(srv.id) === String(sId));
                    if (s && !isServiceAllowedForGender(s, gender)) {
                        return false;
                    }
                }
                return true;
            }),
    });

    const { register, handleSubmit, reset, watch, setValue, setError, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { 
            status: 'active', 
            gender: 'male',
            name: '',
            phone_code: '+966',
            mobile_number: '',
            nationality: '',
            id_number: '',
            address: '',
            team_id: '',
            service_ids: [],
            work_days: DAYS_OF_WEEK.map((d) => d.key),
        },
    });

    const statusValue = watch('status');
    const image = watch('image');
    const watchGender = watch('gender');
    const selectedServiceIds = watch('service_ids') || [];
    const selectedWorkDays = watch('work_days') || [];
    const watchPhoneCode = watch('phone_code') || '+966';
    const selectedCountry = ARAB_COUNTRIES.find((c) => c.phoneCode === watchPhoneCode) || ARAB_COUNTRIES[0];
    const [serviceGenderFilter, setServiceGenderFilter] = useState('compatible');

    const toggleWorkDay = (dayKey) => {
        const current = selectedWorkDays;
        let next;
        if (current.includes(dayKey)) {
            if (current.length === 1) {
                toast.error(isArabic ? 'يجب الإبقاء على يوم عمل واحد على الأقل للعامل!' : 'Worker must have at least one working day!');
                return;
            }
            next = current.filter((d) => d !== dayKey);
        } else {
            next = [...current, dayKey];
        }
        setValue('work_days', next, { shouldValidate: true });
    };

    const selectAllDays = () => {
        setValue('work_days', DAYS_OF_WEEK.map((d) => d.key), { shouldValidate: true });
    };

    const setStandardWorkWeek = () => {
        setValue('work_days', ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'], { shouldValidate: true });
    };

    const filteredServicesList = useMemo(() => {
        return (servicesList || []).filter((service) => {
            if (serviceGenderFilter === 'compatible') {
                return isServiceAllowedForGender(service, watchGender);
            }
            if (serviceGenderFilter === 'male') {
                return isServiceAllowedForGender(service, 'male');
            }
            if (serviceGenderFilter === 'female') {
                return isServiceAllowedForGender(service, 'female');
            }
            return true;
        });
    }, [servicesList, serviceGenderFilter, watchGender]);

    useEffect(() => {
        if (isEditMode && fullWorkerData) {
            const rawServices = fullWorkerData.assigned_services || fullWorkerData.services || [];
            const rawWorkDays = Array.isArray(fullWorkerData.work_days) && fullWorkerData.work_days.length > 0
                ? fullWorkerData.work_days.map((d) => String(d).toLowerCase())
                : DAYS_OF_WEEK.map((d) => d.key);
            const parsed = parsePhone(fullWorkerData.phone_number, fullWorkerData.nationality);
            reset({
                name: fullWorkerData.name || '',
                phone_code: parsed.phoneCode,
                mobile_number: parsed.mobile,
                nationality: fullWorkerData.nationality || '',
                id_number: fullWorkerData.id_number || '',
                address: fullWorkerData.address || '',
                gender: fullWorkerData.gender || 'male',
                status: fullWorkerData.status || 'active',
                team_id: fullWorkerData.team_id ? String(fullWorkerData.team_id) : (fullWorkerData.team?.id ? String(fullWorkerData.team.id) : ''),
                service_ids: rawServices.map((s) => String(s.id)),
                work_days: rawWorkDays,
            });
        }
    }, [fullWorkerData, isEditMode, reset]);

    useEffect(() => {
        if (!watchGender || !Array.isArray(selectedServiceIds) || selectedServiceIds.length === 0) return;
        const validIds = selectedServiceIds.filter((id) => {
            const s = (servicesList || []).find((srv) => String(srv.id) === String(id));
            return s ? isServiceAllowedForGender(s, watchGender) : true;
        });
        if (validIds.length !== selectedServiceIds.length) {
            setValue('service_ids', validIds, { shouldValidate: true });
        }
    }, [watchGender, servicesList]);

    const handleServiceToggle = (service) => {
        if (!isServiceAllowedForGender(service, watchGender)) {
            const isMaleTarget = service.id === 5 || service.is_team_based || (Number(service.id) >= 6 && Number(service.id) <= 11) || (service.service_code || '').toUpperCase() === 'DEEP_CLEANING';
            toast.error(
                isArabic
                    ? `هذه الخدمة مخصصة لـ (${isMaleTarget ? 'الذكور' : 'الإناث'}) فقط ولا يمكن إسنادها لعامل (${watchGender === 'male' ? 'ذكر' : 'أنثى'}).`
                    : `This service is restricted to ${isMaleTarget ? 'Male' : 'Female'} workers only.`
            );
            return;
        }

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
            
            const country = ARAB_COUNTRIES.find((c) => c.phoneCode === data.phone_code);
            let cleanMobile = String(data.mobile_number).replace(/\D/g, '');
            if (country && cleanMobile.startsWith('0') && cleanMobile.length === country.digits + 1) {
                cleanMobile = cleanMobile.substring(1);
            }
            payload.append('phone_number', `${data.phone_code}${cleanMobile}`);

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

            if (data.work_days && data.work_days.length > 0) {
                data.work_days.forEach((day) => {
                    payload.append('work_days[]', day);
                });
            }

            const url = isEditMode ? `/admin/workers/${workerToEdit.id}` : '/admin/workers';
            return axiosInstance.post(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم حفظ بيانات العامل بنجاح' : 'Worker details saved successfully'));
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            queryClient.invalidateQueries({ queryKey: ['worker-details'] });
            queryClient.invalidateQueries({ queryKey: ['workerDetails'] });
            onSuccess?.();
            onClose();
        },
        onError: (error) => {
            const validationErrors = error.response?.data?.errors || error.response?.data?.params;
            if (validationErrors) {
                Object.entries(validationErrors).forEach(([key, messages]) => {
                    const message = Array.isArray(messages) ? messages[0] : messages;
                    if (key === 'phone_number') {
                        setError('mobile_number', { type: 'server', message });
                    } else {
                        setError(key, { type: 'server', message });
                    }
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
                        <div className="flex items-center justify-between mb-1.5">
                            <label className={LABEL_CLASS} style={{ marginBottom: 0 }}>
                                {isArabic ? 'رقم الجوال' : 'Mobile Number'}
                            </label>
                            {selectedCountry && (
                                <span className="text-[11px] text-gray-500 font-mono">
                                    {selectedCountry.digits} {isArabic ? 'أرقام' : 'digits'} ({selectedCountry.sample})
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2" dir="ltr">
                            <div className="w-36 shrink-0">
                                <SelectField registration={register('phone_code')}>
                                    {ARAB_COUNTRIES.map((c) => (
                                        <option key={`${c.code}-${c.phoneCode}`} value={c.phoneCode}>
                                            {c.flag} {c.phoneCode}
                                        </option>
                                    ))}
                                </SelectField>
                            </div>
                            <div className="relative flex-1">
                                <input
                                    type="tel"
                                    placeholder={selectedCountry?.sample || '5XXXXXXXX'}
                                    {...register('mobile_number')}
                                    className={`${INPUT_CLASS} ${errors.mobile_number ? 'border-red-500' : ''}`}
                                />
                            </div>
                        </div>
                        <ErrorMsg name="mobile_number" />
                        <ErrorMsg name="phone_code" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('form.nationality')}</label>
                        <SelectField
                            registration={register('nationality', {
                                onChange: (e) => {
                                    const selected = ARAB_COUNTRIES.find((c) => c.code === e.target.value);
                                    if (selected) {
                                        setValue('phone_code', selected.phoneCode, { shouldValidate: true });
                                    }
                                },
                            })}
                        >
                            <option value="">{isArabic ? 'اختر الجنسية' : 'Select nationality'}</option>
                            {ARAB_COUNTRIES.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.flag} {isArabic ? c.nameAr : c.nameEn}
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
                    {/* Service Gender Filter Tabs (No icons, text titles only) */}
                    <div className="flex flex-wrap items-center gap-1.5 pb-1">
                        <span className="text-xs font-bold text-gray-500 me-1">
                            {isArabic ? 'تصفية الخدمات:' : 'Filter services:'}
                        </span>
                        <button
                            type="button"
                            onClick={() => setServiceGenderFilter('compatible')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                                serviceGenderFilter === 'compatible'
                                    ? 'bg-[#E91E63] text-white border-[#E91E63] shadow-xs'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {isArabic ? (watchGender === 'female' ? 'متوافقة (إناث)' : 'متوافقة (ذكور)') : (watchGender === 'female' ? 'Compatible (Female)' : 'Compatible (Male)')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setServiceGenderFilter('all')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                                serviceGenderFilter === 'all'
                                    ? 'bg-gray-800 text-white border-gray-800 shadow-xs'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {isArabic ? 'الكل' : 'All'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setServiceGenderFilter('male')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                                serviceGenderFilter === 'male'
                                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-sky-50'
                            }`}
                        >
                            {isArabic ? 'خدمات الذكور' : 'Male services'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setServiceGenderFilter('female')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                                serviceGenderFilter === 'female'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-rose-50'
                            }`}
                        >
                            {isArabic ? 'خدمات الإناث' : 'Female services'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                        {isServicesLoading ? (
                            <div className="col-span-2 text-center py-4 text-xs text-gray-400">{t('loading')}</div>
                        ) : filteredServicesList.length === 0 ? (
                            <div className="col-span-2 text-center py-4 text-xs text-gray-400">{t('no_data')}</div>
                        ) : (
                            filteredServicesList.map((service) => {
                                const sId = String(service.id);
                                const isSelected = selectedServiceIds.includes(sId);
                                const isSpecialized = service.is_team_based || (Number(service.id) >= 6 && Number(service.id) <= 11);
                                const isAllowed = isServiceAllowedForGender(service, watchGender);

                                const code = (service.service_code || '').toUpperCase();
                                const numId = Number(service.id);
                                let genderBadge = null;
                                if (['DOMESTIC_HELPER_HOURLY', 'BABYSITTER_HOURLY', 'PEDICURE_MANICURE'].includes(code) || [1, 3, 4].includes(numId)) {
                                    genderBadge = { text: isArabic ? 'إناث فقط' : 'Female only', color: 'bg-rose-50 text-rose-600 border-rose-200' };
                                } else if (code === 'DEEP_CLEANING' || numId === 5 || isSpecialized || (numId >= 6 && numId <= 11)) {
                                    genderBadge = { text: isArabic ? 'ذكور فقط' : 'Male only', color: 'bg-sky-50 text-sky-600 border-sky-200' };
                                } else {
                                    genderBadge = { text: isArabic ? 'ذكور / إناث' : 'Male / Female', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
                                }

                                return (
                                    <div
                                        key={service.id}
                                        onClick={() => handleServiceToggle(service)}
                                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                                            !isAllowed
                                                ? 'opacity-40 cursor-not-allowed bg-gray-100/60 border-gray-200'
                                                : isSelected
                                                ? 'bg-pink-50/70 border-[#E91E63] shadow-xs cursor-pointer'
                                                : 'bg-white border-gray-100 hover:border-gray-200 cursor-pointer'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={!isAllowed}
                                                onChange={() => {}}
                                                className="w-4 h-4 text-[#E91E63] rounded border-gray-300 focus:ring-[#E91E63] disabled:opacity-40"
                                            />
                                            <div className="min-w-0">
                                                <p className={`text-xs font-bold truncate ${!isAllowed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                                    {isArabic ? service.name_ar : service.name_en || service.name_ar}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-mono truncate">
                                                    {service.service_code || `SVC-${service.id}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {genderBadge && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${genderBadge.color}`}>
                                                    {genderBadge.text}
                                                </span>
                                            )}
                                            <span
                                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                                    isSpecialized
                                                        ? 'bg-purple-50 text-purple-600'
                                                        : 'bg-blue-50 text-blue-600'
                                                }`}
                                            >
                                                {isSpecialized ? (isArabic ? 'تخصصية (6-11)' : 'Specialized') : (isArabic ? 'عادية (1-5)' : 'Standard')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <ErrorMsg name="services" />
                    <ErrorMsg name="service_ids" />
                </div>
            </FormSection>

            {/* Work Days & Vacation Schedule */}
            <FormSection
                icon="clock"
                title={isArabic ? 'جدول أيام العمل والإجازات الأسبوعية' : 'Weekly Work Schedule & Vacation Days'}
                description={
                    isArabic
                        ? 'الأيام المحددة هي أيام دوام العامل، والأيام غير المحددة تُعتبر تلقائياً أيام إجازته الأسبوعية (يتم استبعاده ومنع اختياره في الحجوزات المطابقة ليوم إجازته).'
                        : 'Selected days are work days. Unselected days are weekly vacation days (the worker will be excluded and blocked from bookings on their vacation days).'
                }
                action={
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={selectAllDays}
                            className="text-xs font-bold text-[#E91E63] hover:underline cursor-pointer"
                        >
                            {isArabic ? 'تحديد كل الأيام (بدون إجازة)' : 'Select All (No Off)'}
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                            type="button"
                            onClick={setStandardWorkWeek}
                            className="text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
                        >
                            {isArabic ? 'إجازة الجمعة والسبت' : 'Fri & Sat Off'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                        {DAYS_OF_WEEK.map((day) => {
                            const isWorking = selectedWorkDays.includes(day.key);
                            return (
                                <button
                                    key={day.key}
                                    type="button"
                                    onClick={() => toggleWorkDay(day.key)}
                                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-between gap-2 cursor-pointer select-none ${
                                        isWorking
                                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-2xs hover:bg-emerald-100/60'
                                            : 'bg-rose-50/50 border-rose-200 text-rose-800 hover:bg-rose-100/60'
                                    }`}
                                >
                                    <span className="text-xs font-black">
                                        {isArabic ? day.labelAr : day.labelEn}
                                    </span>
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                            isWorking
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                : 'bg-rose-100 text-rose-700 border-rose-300'
                                        }`}
                                    >
                                        {isWorking
                                            ? (isArabic ? '✓ يعمل' : 'Working')
                                            : (isArabic ? '🏖️ إجازة' : 'Vacation')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>
                                {isArabic
                                    ? `أيام العمل: ${selectedWorkDays.length} أيام`
                                    : `Work Days: ${selectedWorkDays.length} days`}
                            </span>
                        </span>
                        <span className="font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span>
                                {isArabic
                                    ? `أيام الإجازة: ${7 - selectedWorkDays.length} أيام`
                                    : `Vacation Days: ${7 - selectedWorkDays.length} days`}
                            </span>
                        </span>
                    </div>
                    <ErrorMsg name="work_days" />
                </div>
            </FormSection>
        </FullScreenFormModal>
    );
}
