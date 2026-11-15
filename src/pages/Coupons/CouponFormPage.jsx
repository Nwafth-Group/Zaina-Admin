import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { INPUT_CLASS, LABEL_CLASS, SelectField, OptionCards, FormSection } from '../../components/form/FormKit';

// Helper date conversions
const toBackendDateTime = (str) => {
    if (!str) return '';
    const formatted = str.replace('T', ' ');
    return formatted.length === 16 ? `${formatted}:00` : formatted;
};

const toFormDateTime = (str) => {
    if (!str) return '';
    return str.replace(' ', 'T').substring(0, 16);
};

export default function CouponFormPage() {
    const { id: couponId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('coupons');
    const queryClient = useQueryClient();
    const isEditMode = !!couponId;
    const isArabic = i18n.language?.startsWith('ar');

    // Targeting states
    const [isForAllUsers, setIsForAllUsers] = useState(true);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);

    const [isForAllCities, setIsForAllCities] = useState(true);
    const [selectedCityIds, setSelectedCityIds] = useState([]);
    const [selectedAreaIds, setSelectedAreaIds] = useState([]);

    const [isForAllServices, setIsForAllServices] = useState(true);
    const [minWorkers, setMinWorkers] = useState('');
    const [selectedServices, setSelectedServices] = useState([]); // [{ id, name, allowed_visit_types: [], min_workers: '' }]

    // User search states
    const [userSearch, setUserSearch] = useState('');
    const [userSearchResults, setUserSearchResults] = useState([]);

    // Validation Schema
    const schema = yup.object().shape({
        name: yup.string().required(t('form.validation.required')),
        code: yup.string().required(t('form.validation.required'))
            .min(2, isArabic ? 'رمز الكوبون يجب ألا يقل عن حرفين.' : 'Coupon code must be at least 2 characters.')
            .max(30, isArabic ? 'رمز الكوبون يجب ألا يتجاوز 30 حرفاً.' : 'Coupon code must not exceed 30 characters.')
            .matches(/^[a-zA-Z0-9_-]+$/, isArabic ? 'رمز الكوبون يجب أن يحتوي على أحرف وأرقام وشرطات وشرطات سفلية فقط.' : 'The code field must only contain letters, numbers, dashes, and underscores.')
            .uppercase(),
        type: yup.string().required(t('form.validation.required')),
        value: yup.number().required(t('form.validation.required')).typeError(t('form.validation.required'))
            .when('type', {
                is: 'percentage',
                then: (schema) => schema.min(0.01, isArabic ? 'قيمة الخصم يجب أن تكون على الأقل 0.01.' : 'The value field must be at least 0.01.').max(100, t('form.validation.value_percentage')),
                otherwise: (schema) => schema.min(0.01, isArabic ? 'قيمة الخصم يجب أن تكون على الأقل 0.01.' : 'The value field must be at least 0.01.'),
            }),
        start_date: yup.string().required(t('form.validation.required')),
        end_date: yup.string().required(t('form.validation.required'))
            .test('is-after-or-equal-start', isArabic ? 'تاريخ النهاية يجب أن يكون تاريخاً بعد أو يساوي تاريخ البداية.' : 'The end date field must be a date after or equal to start date.', function (value) {
                const { start_date } = this.parent;
                if (!start_date || !value) return true;
                return new Date(value) >= new Date(start_date);
            }),
        usage_limit: yup.number().nullable().transform((value, originalValue) => originalValue === '' ? null : value),
        user_usage_limit: yup.number().required(t('form.validation.required')).min(1).typeError(t('form.validation.required')),
        completed_bookings_count: yup.number().required(t('form.validation.required')).min(0).typeError(t('form.validation.required')),
        status: yup.string().required(t('form.validation.required')),
    });

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            type: 'percentage',
            status: 'active',
            user_usage_limit: 1,
            completed_bookings_count: 0,
        },
    });

    const discountType = watch('type');
    const statusValue = watch('status');

    // Fetch details if in edit mode
    const { data: fullCoupon, isLoading: isFetchingCoupon } = useQuery({
        queryKey: ['couponDetail', couponId],
        queryFn: async () => (await axiosInstance.get(`/admin/coupons/${couponId}`)).data.data,
        enabled: isEditMode,
    });

    const isUsed = Boolean(fullCoupon && fullCoupon.used_count > 0);

    // Populate form in edit mode
    useEffect(() => {
        if (isEditMode && fullCoupon) {
            reset({
                name: fullCoupon.name || '',
                code: fullCoupon.code || '',
                type: fullCoupon.type || 'percentage',
                value: fullCoupon.value || 0,
                start_date: toFormDateTime(fullCoupon.start_date),
                end_date: toFormDateTime(fullCoupon.end_date),
                usage_limit: fullCoupon.usage_limit || '',
                user_usage_limit: fullCoupon.user_usage_limit || 1,
                completed_bookings_count: fullCoupon.completed_bookings_count || 0,
                status: fullCoupon.status || 'active',
            });

            const isAllUsers = fullCoupon.is_for_all_users !== undefined
                ? Boolean(fullCoupon.is_for_all_users)
                : (!fullCoupon.users || fullCoupon.users.length === 0);
            setIsForAllUsers(isAllUsers);
            setSelectedUserIds((fullCoupon.users || []).map(u => Number(u.id)));
            setSelectedUsers(fullCoupon.users || []);

            const isAllCities = fullCoupon.is_for_all_cities !== undefined
                ? Boolean(fullCoupon.is_for_all_cities)
                : ((fullCoupon.service_zones?.length ?? fullCoupon.serviceZones?.length ?? 0) === 0);
            setIsForAllCities(isAllCities);
            setSelectedCityIds((fullCoupon.cities || []).map(c => Number(c.id)));
            setSelectedAreaIds((fullCoupon.service_zones || fullCoupon.serviceZones || []).map(z => Number(z.id)));

            const isAllServices = fullCoupon.is_for_all_services !== undefined
                ? Boolean(fullCoupon.is_for_all_services)
                : ((fullCoupon.services?.length ?? 0) === 0);
            setIsForAllServices(isAllServices);
            setMinWorkers(fullCoupon.min_workers ?? '');
            setSelectedServices((fullCoupon.services || []).map(s => {
                const sId = Number(s.id);
                const isFirstService = sId === 1 || s.code === 'hourly_cleaning';
                let types = s.pivot?.allowed_visit_types;
                if (typeof types === 'string') {
                    try { types = JSON.parse(types); } catch { types = null; }
                }
                if (!Array.isArray(types) || types.length === 0) {
                    types = isFirstService ? ['single_visit', 'three_visits_per_week'] : ['single_visit'];
                }
                return {
                    id: sId,
                    name: s.name,
                    code: s.code || s.service_code,
                    allowed_visit_types: types,
                    min_workers: s.pivot?.min_workers ?? s.min_workers ?? '',
                };
            }));
        }
    }, [fullCoupon, isEditMode, reset]);

    // Fetch service zones list
    const { data: serviceZones = [] } = useQuery({
        queryKey: ['serviceZonesList'],
        queryFn: async () => (await axiosInstance.get('/admin/service-zones?per_page=100')).data.data.items || [],
    });

    // Fetch services list
    const { data: services = [] } = useQuery({
        queryKey: ['servicesList'],
        queryFn: async () => (await axiosInstance.get('/admin/services')).data.data.items || [],
    });

    // Search users
    useEffect(() => {
        if (!userSearch.trim()) {
            setUserSearchResults([]);
            return;
        }
        const delay = setTimeout(async () => {
            try {
                let url = `/admin/users?type=customer&search=${encodeURIComponent(userSearch)}&per_page=10`;
                if (!isForAllCities && selectedCityIds.length > 0) {
                    url += `&city_id=${selectedCityIds.join(',')}`;
                }
                const response = await axiosInstance.get(url);
                setUserSearchResults(response.data.data.items || []);
            } catch (err) {
                console.error(err);
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [userSearch, isForAllCities, selectedCityIds]);

    // Save mutation
    const submitMutation = useMutation({
        mutationFn: async (formData) => {
            const payload = {
                ...formData,
                start_date: toBackendDateTime(formData.start_date),
                end_date: toBackendDateTime(formData.end_date),
                is_for_all_users: isForAllUsers,
                is_for_all_cities: isForAllCities,
                is_for_all_services: isForAllServices,
            };

            if (!isForAllUsers) {
                payload.users = selectedUserIds;
            }
            if (!isForAllCities) {
                payload.service_zone_ids = selectedAreaIds;
                if (selectedCityIds.length > 0) {
                    payload.cities = selectedCityIds;
                }
            }
            if (isForAllServices) {
                payload.min_workers = minWorkers !== '' && minWorkers !== null ? Number(minWorkers) : null;
            } else {
                payload.min_workers = null;
                payload.services = selectedServices.map(s => ({
                    id: s.id,
                    allowed_visit_types: s.allowed_visit_types.length > 0 ? s.allowed_visit_types : null,
                    min_workers: s.min_workers !== '' && s.min_workers !== null ? Number(s.min_workers) : null,
                }));
            }

            if (isEditMode) {
                return axiosInstance.put(`/admin/coupons/${couponId}`, payload);
            }
            return axiosInstance.post('/admin/coupons', payload);
        },
        onSuccess: (response) => {
            toast.success(response.data.message || (isArabic ? 'تم حفظ الكوبون بنجاح' : 'Coupon saved successfully'));
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
            queryClient.invalidateQueries({ queryKey: ['couponDetail'] });
            navigate('/coupons');
        },
        onError: (error) => {
            const apiMsg = error.response?.data?.message;
            const validationErrors = error.response?.data?.errors || error.response?.data?.params;
            if (validationErrors) {
                const firstVal = Object.values(validationErrors)[0];
                const firstErr = Array.isArray(firstVal) ? firstVal[0] : firstVal;
                toast.error(firstErr || (isArabic ? 'خطأ في التحقق من البيانات.' : 'Validation error.'));
            } else {
                toast.error(apiMsg || (isArabic ? 'حدث خطأ أثناء الحفظ.' : 'An error occurred during save.'));
            }
        },
    });

    const onInvalid = (formErrors) => {
        console.error('Coupon form validation errors:', formErrors);
        const firstVal = Object.values(formErrors)[0];
        const msg = firstVal?.message || (isArabic ? 'يرجى مراجعة وتصحيح الحقول المطلوبة في النموذج.' : 'Please fix the required fields.');
        toast.error(msg);
    };

    const onSubmit = (data) => {
        if (!isForAllUsers && selectedUserIds.length === 0) {
            toast.error(t('form.validation.min_one_user'));
            return;
        }
        if (!isForAllCities && selectedAreaIds.length === 0) {
            toast.error(isArabic ? 'يرجى اختيار منطقة تغطية واحدة على الأقل.' : 'Please select at least one service zone.');
            return;
        }
        if (!isForAllServices && selectedServices.length === 0) {
            toast.error(t('form.validation.min_one_service'));
            return;
        }

        if (isUsed && fullCoupon) {
            if (data.end_date && fullCoupon.end_date) {
                const newEndDate = new Date(data.end_date);
                const oldEndDate = new Date(fullCoupon.end_date);
                if (newEndDate < oldEndDate) {
                    toast.error(isArabic ? 'لا يمكن تقليل مدة كوبون مستخدم بالفعل.' : 'Cannot reduce duration of used coupon.');
                    return;
                }
            }
            if (data.usage_limit !== '' && data.usage_limit !== null) {
                const newLimit = Number(data.usage_limit);
                if (newLimit < fullCoupon.used_count) {
                    toast.error(isArabic ? 'حد الاستخدام لا يمكن أن يكون أقل من عدد مرات الاستخدام الحالي.' : 'Usage limit cannot be less than current usage.');
                    return;
                }
            }
        }

        submitMutation.mutate(data);
    };

    // User selection helpers
    const handleAddUser = (user) => {
        const numId = Number(user.id);
        if (!selectedUserIds.some(id => Number(id) === numId)) {
            setSelectedUserIds(prev => [...prev, numId]);
            setSelectedUsers(prev => [...prev, user]);
        }
        setUserSearch('');
        setUserSearchResults([]);
    };

    const handleRemoveUser = (userId) => {
        const numId = Number(userId);
        setSelectedUserIds(prev => prev.filter(id => Number(id) !== numId));
        setSelectedUsers(prev => prev.filter(u => Number(u.id) !== numId));
    };

    // City & Area helpers
    const handleCityToggle = (cityId) => {
        const numId = Number(cityId);
        if (selectedCityIds.includes(numId)) {
            setSelectedCityIds(prev => prev.filter(id => Number(id) !== numId));
            const cityAreas = areas.filter(a => Number(a.city_id) === numId).map(a => Number(a.id));
            setSelectedAreaIds(prev => prev.filter(id => !cityAreas.includes(Number(id))));
        } else {
            setSelectedCityIds(prev => [...prev, numId]);
        }
    };

    const handleAreaToggle = (areaId) => {
        const numId = Number(areaId);
        if (selectedAreaIds.some(id => Number(id) === numId)) {
            setSelectedAreaIds(prev => prev.filter(id => Number(id) !== numId));
        } else {
            setSelectedAreaIds(prev => [...prev, numId]);
        }
    };

    // Service helpers
    const handleServiceToggle = (service) => {
        const sId = Number(service.id);
        const exists = selectedServices.some(s => Number(s.id) === sId);
        if (exists) {
            setSelectedServices(prev => prev.filter(s => Number(s.id) !== sId));
        } else {
            const isFirstService = sId === 1 || service.code === 'hourly_cleaning';
            setSelectedServices(prev => [...prev, {
                id: sId,
                code: service.code || service.service_code,
                name: isArabic ? service.name_ar : service.name_en,
                allowed_visit_types: isFirstService ? ['single_visit', 'three_visits_per_week'] : ['single_visit'],
                min_workers: '',
            }]);
        }
    };

    const handleVisitTypeToggle = (serviceId, visitType) => {
        const sId = Number(serviceId);
        setSelectedServices(prev => prev.map(s => {
            if (Number(s.id) !== sId) return s;
            const isFirstService = sId === 1 || s.code === 'hourly_cleaning';
            if (!isFirstService && visitType === 'three_visits_per_week') return s;

            const hasVt = s.allowed_visit_types.includes(visitType);
            const updatedVt = hasVt
                ? s.allowed_visit_types.filter(v => v !== visitType)
                : [...s.allowed_visit_types, visitType];
            return { ...s, allowed_visit_types: updatedVt };
        }));
    };

    const handleServiceMinWorkersChange = (serviceId, val) => {
        const sId = Number(serviceId);
        setSelectedServices(prev => prev.map(s => {
            if (Number(s.id) !== sId) return s;
            return { ...s, min_workers: val };
        }));
    };

    const filteredAreas = serviceZones;

    return (
        <div className="space-y-6 font-main max-w-7xl mx-auto pb-12">
            {/* Top Navigation & Title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
                <div>
                    <button
                        type="button"
                        onClick={() => navigate('/coupons')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E91E63] transition-colors mb-1.5 outline-none group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>{isArabic ? 'العودة لقائمة الكوبونات' : 'Back to Coupons'}</span>
                    </button>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                        {isEditMode ? (isArabic ? 'تعديل بيانات الكوبون' : 'Edit Coupon') : (isArabic ? 'إضافة كوبون خصم جديد' : 'Create New Coupon')}
                    </h2>
                </div>
            </div>

            {isEditMode && isFetchingCoupon ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-20 flex flex-col items-center justify-center text-gray-400">
                    <svg className="animate-spin h-9 w-9 text-[#E91E63]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="font-bold text-sm text-gray-600 mt-3">{isArabic ? 'جاري تحميل بيانات الكوبون...' : 'Loading coupon data...'}</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
                    {/* 1. Basic Info Section */}
                    <FormSection icon="info" title={t('details.basic_info')}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASS}>{t('form.name')} *</label>
                                <input
                                    type="text"
                                    {...register('name')}
                                    placeholder={t('form.name_placeholder')}
                                    className={`${INPUT_CLASS} ${errors.name ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                />
                                {errors.name && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>{t('form.code')} *</label>
                                <input
                                    type="text"
                                    {...register('code')}
                                    disabled={isUsed}
                                    placeholder={t('form.code_placeholder')}
                                    className={`${INPUT_CLASS} font-mono uppercase ${errors.code ? 'border-rose-500 ring-2 ring-rose-500/10' : ''} ${isUsed ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                />
                                {errors.code && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.code.message}</p>}
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>{t('form.type')} *</label>
                                <OptionCards
                                    name="type"
                                    value={discountType}
                                    disabled={isUsed}
                                    onChange={(val) => setValue('type', val)}
                                    options={[
                                        { value: 'percentage', label: t('types.percentage'), description: t('types.percentage_desc') },
                                        { value: 'fixed', label: t('types.fixed'), description: t('types.fixed_desc') },
                                    ]}
                                />
                                {errors.type && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.type.message}</p>}
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>{t('form.value')} * ({discountType === 'percentage' ? '%' : 'EGP'})</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('value')}
                                    disabled={isUsed}
                                    placeholder="0"
                                    className={`${INPUT_CLASS} ${errors.value ? 'border-rose-500 ring-2 ring-rose-500/10' : ''} ${isUsed ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                />
                                {errors.value && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.value.message}</p>}
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>{t('form.status')} *</label>
                                <SelectField registration={register('status')}>
                                    <option value="active">{t('status.active')}</option>
                                    <option value="inactive">{t('status.inactive')}</option>
                                </SelectField>
                                {errors.status && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.status.message}</p>}
                            </div>
                        </div>
                    </FormSection>

                    {/* 2. Validity & Usage Limits Section */}
                    <FormSection icon="clock" title={t('details.validity')}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASS}>{t('details.start_date')} *</label>
                                <input
                                    type="datetime-local"
                                    {...register('start_date')}
                                    disabled={isUsed}
                                    className={`${INPUT_CLASS} ${errors.start_date ? 'border-rose-500 ring-2 ring-rose-500/10' : ''} ${isUsed ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                />
                                {errors.start_date && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.start_date.message}</p>}
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>{t('details.end_date')} *</label>
                                <input
                                    type="datetime-local"
                                    {...register('end_date')}
                                    className={`${INPUT_CLASS} ${errors.end_date ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                />
                                {errors.end_date && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.end_date.message}</p>}
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>{t('details.usage_limit')} ({isArabic ? 'اختياري' : 'Optional'})</label>
                                <input
                                    type="number"
                                    {...register('usage_limit')}
                                    placeholder={isArabic ? 'مثال: 100 (اتركه فارغاً للاستخدام اللانهائي)' : 'e.g. 100 (leave empty for unlimited)'}
                                    className={`${INPUT_CLASS} ${errors.usage_limit ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                />
                                {errors.usage_limit && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.usage_limit.message}</p>}
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>{t('details.user_usage_limit')} *</label>
                                <input
                                    type="number"
                                    {...register('user_usage_limit')}
                                    placeholder="1"
                                    className={`${INPUT_CLASS} ${errors.user_usage_limit ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                />
                                {errors.user_usage_limit && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.user_usage_limit.message}</p>}
                            </div>

                            <div>
                                <label className={LABEL_CLASS}>{t('details.completed_bookings_count')} *</label>
                                <input
                                    type="number"
                                    {...register('completed_bookings_count')}
                                    placeholder="0"
                                    className={`${INPUT_CLASS} ${errors.completed_bookings_count ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                                />
                                {errors.completed_bookings_count && <p className="text-xs text-rose-600 mt-1 font-bold">{errors.completed_bookings_count.message}</p>}
                            </div>
                        </div>
                    </FormSection>

                    {/* 3. User Targeting Section */}
                    <FormSection icon="user" title={t('form.is_for_all_users')}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="coupon_users_scope"
                                        checked={isForAllUsers}
                                        onChange={() => setIsForAllUsers(true)}
                                        className="w-4 h-4 text-[#E91E63] focus:ring-[#E91E63]"
                                    />
                                    <span className="text-xs font-bold text-gray-800">{t('details.all_users')}</span>
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="coupon_users_scope"
                                        checked={!isForAllUsers}
                                        onChange={() => setIsForAllUsers(false)}
                                        className="w-4 h-4 text-[#E91E63] focus:ring-[#E91E63]"
                                    />
                                    <span className="text-xs font-bold text-gray-800">{isArabic ? 'عملاء محددون فقط' : 'Specific Users Only'}</span>
                                </label>
                            </div>

                            {!isForAllUsers && (
                                <div className="space-y-3 pt-2">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            placeholder={isArabic ? 'ابحث عن عملاء بالاسم أو رقم الهاتف...' : 'Search customers by name or mobile...'}
                                            className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:border-[#E91E63] outline-none"
                                        />
                                        {userSearchResults.length > 0 && (
                                            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-50">
                                                {userSearchResults.map(u => (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        onClick={() => handleAddUser(u)}
                                                        className="w-full text-start p-2.5 hover:bg-pink-50/50 flex justify-between items-center transition-colors text-xs"
                                                    >
                                                        <span className="font-bold text-gray-800">{u.name || `${u.first_name || ''} ${u.last_name || ''}`}</span>
                                                        <span className="text-gray-400 font-mono" dir="ltr">{u.phone_number || u.phone}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Selected users chips */}
                                    {selectedUsers.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {selectedUsers.map(u => (
                                                <span key={u.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-50 text-[#E91E63] border border-pink-100 rounded-xl text-xs font-extrabold shadow-2xs">
                                                    <span>{u.name || `${u.first_name || ''} ${u.last_name || ''}`}</span>
                                                    <button type="button" onClick={() => handleRemoveUser(u.id)} className="hover:text-rose-700">✕</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </FormSection>

                    {/* 4. Geographic Constraints Section */}
                    <FormSection icon="location" title={t('form.is_for_all_cities')}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="coupon_cities_scope"
                                        checked={isForAllCities}
                                        onChange={() => setIsForAllCities(true)}
                                        className="w-4 h-4 text-[#E91E63] focus:ring-[#E91E63]"
                                    />
                                    <span className="text-xs font-bold text-gray-800">{isArabic ? 'جميع المناطق الجغرافية' : 'All Service Zones'}</span>
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="coupon_cities_scope"
                                        checked={!isForAllCities}
                                        onChange={() => setIsForAllCities(false)}
                                        className="w-4 h-4 text-[#E91E63] focus:ring-[#E91E63]"
                                    />
                                    <span className="text-xs font-bold text-gray-800">{isArabic ? 'مناطق تغطية جغرافية محددة فقط' : 'Specific Service Zones Only'}</span>
                                </label>
                            </div>

                            {!isForAllCities && (
                                <div className="space-y-4 pt-2">
                                    {/* Service Zones Checkboxes */}
                                    {serviceZones.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-extrabold text-gray-700 mb-2">{isArabic ? 'مناطق التغطية الجغرافية المحددة:' : 'Specific Service Zones:'}</label>
                                            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                                                {serviceZones.map(z => {
                                                    const isChecked = selectedAreaIds.some(id => Number(id) === Number(z.id));
                                                    return (
                                                        <button
                                                            key={z.id}
                                                            type="button"
                                                            onClick={() => handleAreaToggle(z.id)}
                                                            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                                                                isChecked
                                                                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                                            }`}
                                                        >
                                                            {z.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </FormSection>

                    {/* 5. Service Constraints Section */}
                    <FormSection icon="sparkles" title={t('details.service_constraints')}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="coupon_services_scope"
                                        checked={isForAllServices}
                                        onChange={() => setIsForAllServices(true)}
                                        className="w-4 h-4 text-[#E91E63] focus:ring-[#E91E63]"
                                    />
                                    <span className="text-xs font-bold text-gray-800">{t('details.all_services')}</span>
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="coupon_services_scope"
                                        checked={!isForAllServices}
                                        onChange={() => setIsForAllServices(false)}
                                        className="w-4 h-4 text-[#E91E63] focus:ring-[#E91E63]"
                                    />
                                    <span className="text-xs font-bold text-gray-800">{isArabic ? 'خدمات محددة فقط' : 'Specific Services Only'}</span>
                                </label>
                            </div>

                            {isForAllServices ? (
                                <div className="pt-2 max-w-xs">
                                    <label className={LABEL_CLASS}>{isArabic ? 'الحد الأدنى لعدد العاملات' : 'Min Workers'}</label>
                                    <input
                                        type="number"
                                        value={minWorkers}
                                        onChange={(e) => setMinWorkers(e.target.value)}
                                        placeholder="0"
                                        className={INPUT_CLASS}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4 pt-2">
                                    <div className="flex flex-wrap gap-2">
                                        {services.map(svc => {
                                            const isSelected = selectedServices.some(s => Number(s.id) === Number(svc.id));
                                            return (
                                                <button
                                                    key={svc.id}
                                                    type="button"
                                                    onClick={() => handleServiceToggle(svc)}
                                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                                                        isSelected
                                                            ? 'bg-[#E91E63] text-white border-[#E91E63] shadow-2xs'
                                                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {isArabic ? svc.name_ar : svc.name_en}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Per-service visit types & min workers configuration */}
                                    {selectedServices.length > 0 && (
                                        <div className="space-y-3 pt-3 border-t border-gray-100">
                                            <p className="text-xs font-extrabold text-gray-700">{isArabic ? 'تخصيص قواعد زيارات العاملات لكل خدمة:' : 'Per-service Visit Rules & Min Workers:'}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {selectedServices.map(svc => {
                                                    const sId = Number(svc.id);
                                                    const isFirstService = sId === 1 || svc.code === 'hourly_cleaning';
                                                    const availableVisitTypes = isFirstService
                                                        ? ['single_visit', 'three_visits_per_week']
                                                        : ['single_visit'];

                                                    return (
                                                        <div key={svc.id} className="p-4 border border-gray-100 rounded-2xl bg-gray-50/60 space-y-3">
                                                            <h6 className="text-xs font-extrabold text-gray-900 border-b border-gray-200/60 pb-2">{svc.name}</h6>

                                                            <div>
                                                                <p className="text-[11px] font-bold text-gray-500 uppercase mb-1.5">{t('details.allowed_visit_types')}</p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {availableVisitTypes.map(vt => {
                                                                        const hasVt = svc.allowed_visit_types?.includes(vt);
                                                                        const vtLabel = vt === 'single_visit'
                                                                            ? (isArabic ? 'زيارة واحدة' : 'Single Visit')
                                                                            : (isArabic ? '3 زيارات أسبوعياً' : '3 Visits / Week');

                                                                        return (
                                                                            <button
                                                                                key={vt}
                                                                                type="button"
                                                                                onClick={() => handleVisitTypeToggle(svc.id, vt)}
                                                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                                                                    hasVt
                                                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                                                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                                                }`}
                                                                            >
                                                                                {vtLabel}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">{isArabic ? 'الحد الأدنى للعاملات' : 'Min Workers'}</label>
                                                                <input
                                                                    type="number"
                                                                    value={svc.min_workers || ''}
                                                                    onChange={(e) => handleServiceMinWorkersChange(svc.id, e.target.value)}
                                                                    placeholder="0"
                                                                    className="w-full text-xs p-2 border border-gray-200 rounded-xl focus:border-[#E91E63] outline-none bg-white font-bold"
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </FormSection>

                    {/* Action Bar Footer */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/coupons')}
                            className="px-5 h-11 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors outline-none"
                        >
                            {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={submitMutation.isPending}
                            className="px-6 h-11 rounded-xl text-xs font-bold bg-[#E91E63] text-white hover:bg-[#D81B60] transition-colors shadow-2xs flex items-center gap-2 outline-none disabled:opacity-50"
                        >
                            {submitMutation.isPending && (
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            )}
                            <span>{isEditMode ? (isArabic ? 'تحديث الكوبون' : 'Update Coupon') : (isArabic ? 'حفظ الكوبون' : 'Save Coupon')}</span>
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
