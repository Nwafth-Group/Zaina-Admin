import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FullScreenFormModal from '../../components/form/FullScreenFormModal';
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

export default function CouponActionModal({ couponToEdit, onClose }) {
    const { t, i18n } = useTranslation('coupons');
    const queryClient = useQueryClient();
    const isEditMode = !!couponToEdit;
    const isArabic = i18n.language?.startsWith('ar');

    // Basic states for targeting rules
    const [isForAllUsers, setIsForAllUsers] = useState(true);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    
    const [isForAllCities, setIsForAllCities] = useState(true);
    const [selectedCityIds, setSelectedCityIds] = useState([]);
    const [selectedAreaIds, setSelectedAreaIds] = useState([]);

    const [isForAllServices, setIsForAllServices] = useState(true);
    const [selectedServices, setSelectedServices] = useState([]); // [{ id, allowed_visit_types: [] }]

    // User search search-bar states
    const [userSearch, setUserSearch] = useState('');
    const [userSearchResults, setUserSearchResults] = useState([]);

    // Validation Schema
    const schema = yup.object().shape({
        name: yup.string().required(t('form.validation.required')),
        code: yup.string().required(t('form.validation.required')).max(10).uppercase(),
        type: yup.string().required(t('form.validation.required')),
        value: yup.number().required(t('form.validation.required')).typeError(t('form.validation.required'))
            .when('type', {
                is: 'percentage',
                then: (schema) => schema.min(0).max(100, t('form.validation.value_percentage')),
                otherwise: (schema) => schema.min(0, t('form.validation.value_fixed')),
            }),
        start_date: yup.string().required(t('form.validation.required')),
        end_date: yup.string().required(t('form.validation.required')),
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

    // Fetch full details of coupon for edit mode
    const { data: fullCoupon, isLoading: isFetchingCoupon } = useQuery({
        queryKey: ['couponDetail', couponToEdit?.id],
        queryFn: async () => (await axiosInstance.get(`/admin/coupons/${couponToEdit.id}`)).data.data,
        enabled: isEditMode && !!couponToEdit?.id,
    });

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

            setIsForAllUsers(Boolean(fullCoupon.is_for_all_users));
            setSelectedUserIds((fullCoupon.users || []).map(u => u.id));
            setIsForAllCities(Boolean(fullCoupon.is_for_all_cities));
            setSelectedCityIds((fullCoupon.cities || []).map(c => c.id));
            setSelectedAreaIds((fullCoupon.areas || []).map(a => a.id));
            setIsForAllServices(Boolean(fullCoupon.is_for_all_services));
            setSelectedServices((fullCoupon.services || []).map(s => ({
                id: s.id,
                name: s.name,
                allowed_visit_types: s.pivot?.allowed_visit_types || [],
            })));
        }
    }, [fullCoupon, isEditMode, reset]);

    // Fetch cities & areas targeting lists
    const { data: cities = [] } = useQuery({
        queryKey: ['citiesList'],
        queryFn: async () => (await axiosInstance.get('/admin/cities')).data.data.items || [],
    });

    const { data: areas = [] } = useQuery({
        queryKey: ['areasList'],
        queryFn: async () => (await axiosInstance.get('/admin/areas')).data.data.items || [],
    });

    // Fetch services targeting list
    const { data: services = [] } = useQuery({
        queryKey: ['servicesList'],
        queryFn: async () => (await axiosInstance.get('/admin/services')).data.data.items || [],
    });

    // Search users query
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

    // Mutations for submit
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
                payload.cities = selectedCityIds;
                if (selectedAreaIds.length > 0) {
                    payload.areas = selectedAreaIds;
                }
            }
            if (!isForAllServices) {
                payload.services = selectedServices.map(s => ({
                    id: s.id,
                    allowed_visit_types: s.allowed_visit_types.length > 0 ? s.allowed_visit_types : null,
                }));
            }

            if (isEditMode) {
                return axiosInstance.put(`/admin/coupons/${couponToEdit.id}`, payload);
            }
            return axiosInstance.post('/admin/coupons', payload);
        },
        onSuccess: (response) => {
            toast.success(response.data.message || (isArabic ? 'تم حفظ الكوبون بنجاح' : 'Coupon saved successfully'));
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
            onClose();
        },
        onError: (error) => {
            const apiMsg = error.response?.data?.message;
            const validationErrors = error.response?.data?.params;
            if (validationErrors) {
                const firstErr = Object.values(validationErrors)[0];
                toast.error(firstErr || (isArabic ? 'خطأ في التحقق من البيانات.' : 'Validation error.'));
            } else {
                toast.error(apiMsg || (isArabic ? 'حدث خطأ أثناء الحفظ.' : 'An error occurred during save.'));
            }
        },
    });

    const onSubmit = (data) => {
        // targeting validations
        if (!isForAllUsers && selectedUserIds.length === 0) {
            toast.error(t('form.validation.min_one_user'));
            return;
        }
        if (!isForAllCities && selectedCityIds.length === 0) {
            toast.error(t('form.validation.min_one_city'));
            return;
        }
        if (!isForAllServices && selectedServices.length === 0) {
            toast.error(t('form.validation.min_one_service'));
            return;
        }
        submitMutation.mutate(data);
    };

    // User select helpers
    const handleAddUser = (user) => {
        if (!selectedUserIds.includes(user.id)) {
            setSelectedUserIds(prev => [...prev, user.id]);
        }
        setUserSearch('');
    };

    const handleRemoveUser = (userId) => {
        setSelectedUserIds(prev => prev.filter(id => id !== userId));
    };

    // City & Area helpers
    const toggleCity = (cityId) => {
        const id = Number(cityId);
        setSelectedCityIds(prev => {
            const next = prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id];
            // Remove areas belonging to unchecked city
            if (prev.includes(id)) {
                const areasInCity = areas.filter(a => a.city_id === id).map(a => a.id);
                setSelectedAreaIds(pAreas => pAreas.filter(aId => !areasInCity.includes(aId)));
            }
            return next;
        });
    };

    const toggleArea = (areaId) => {
        const id = Number(areaId);
        setSelectedAreaIds(prev =>
            prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
        );
    };

    // Services pivots helpers
    const toggleServiceCheckbox = (service) => {
        setSelectedServices(prev => {
            const exists = prev.some(s => s.id === service.id);
            if (exists) {
                return prev.filter(s => s.id !== service.id);
            } else {
                return [...prev, { id: service.id, name: service.name, allowed_visit_types: [] }];
            }
        });
    };

    const toggleServiceVisitType = (serviceId, visitType) => {
        setSelectedServices(prev => prev.map(s => {
            if (s.id !== serviceId) return s;
            const types = s.allowed_visit_types.includes(visitType)
                ? s.allowed_visit_types.filter(t => t !== visitType)
                : [...s.allowed_visit_types, visitType];
            return { ...s, allowed_visit_types: types };
        }));
    };

    const addServiceShift = (serviceId) => {
        setSelectedServices(prev => prev.map(s => {
            if (s.id !== serviceId) return s;
            return { ...s, allowed_shifts: [...s.allowed_shifts, { start_time: '08:00', end_time: '12:00' }] };
        }));
    };

    const updateServiceShift = (serviceId, shiftIndex, key, value) => {
        setSelectedServices(prev => prev.map(s => {
            if (s.id !== serviceId) return s;
            const updatedShifts = s.allowed_shifts.map((sh, idx) => {
                if (idx !== shiftIndex) return sh;
                return { ...sh, [key]: value };
            });
            return { ...s, allowed_shifts: updatedShifts };
        }));
    };

    const removeServiceShift = (serviceId, shiftIndex) => {
        setSelectedServices(prev => prev.map(s => {
            if (s.id !== serviceId) return s;
            return { ...s, allowed_shifts: s.allowed_shifts.filter((_, idx) => idx !== shiftIndex) };
        }));
    };

    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    if (isEditMode && isFetchingCoupon) {
        return (
            <div className="fixed inset-0 z-50 bg-[#F8F9FA] flex justify-center items-center">
                <svg className="animate-spin h-8 w-8 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
            </div>
        );
    }

    return (
        <FullScreenFormModal
            title={isEditMode ? t('form.title_edit') : t('form.title_add')}
            onClose={onClose}
            formId="coupon-form"
            onSubmit={handleSubmit(onSubmit)}
            isSubmitting={submitMutation.isPending}
            cancelLabel={t('form.cancel')}
            submitLabel={t('form.submit')}
        >
            {/* Section 1: Basic Configuration */}
            <FormSection icon="info" title={t('details.basic_info')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('form.name')}</label>
                        <input {...register('name')} className={`${INPUT_CLASS} ${errors.name ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="name" />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>{t('form.code')}</label>
                        <input 
                            {...register('code')} 
                            placeholder="e.g. EXTRA50"
                            className={`${INPUT_CLASS} ${errors.code ? 'border-red-500' : ''}`} 
                            onChange={(e) => setValue('code', e.target.value.toUpperCase())}
                        />
                        <ErrorMsg name="code" />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>{t('form.type')}</label>
                        <SelectField registration={register('type')}>
                            <option value="percentage">{t('types.percentage')}</option>
                            <option value="fixed">{t('types.fixed')}</option>
                        </SelectField>
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>{t('form.value')}</label>
                        <input type="number" step="any" min="0" {...register('value')} className={`${INPUT_CLASS} ${errors.value ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="value" />
                    </div>
                </div>
            </FormSection>

            {/* Section 2: Redemption Limits & Validity */}
            <FormSection icon="clock" title={t('details.limits')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('form.start_date')}</label>
                        <input type="datetime-local" {...register('start_date')} className={`${INPUT_CLASS} ${errors.start_date ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="start_date" />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>{t('form.end_date')}</label>
                        <input type="datetime-local" {...register('end_date')} className={`${INPUT_CLASS} ${errors.end_date ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="end_date" />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>{t('form.usage_limit')}</label>
                        <input type="number" min="1" {...register('usage_limit')} className={INPUT_CLASS} />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>{t('form.user_usage_limit')}</label>
                        <input type="number" min="1" {...register('user_usage_limit')} className={`${INPUT_CLASS} ${errors.user_usage_limit ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="user_usage_limit" />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>{t('form.completed_bookings_count')}</label>
                        <input type="number" min="0" {...register('completed_bookings_count')} className={`${INPUT_CLASS} ${errors.completed_bookings_count ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="completed_bookings_count" />
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
                </div>
            </FormSection>

            {/* Section 3: Targeting Rules */}
            <FormSection icon="user" title={t('details.targeting')}>
                <div className="space-y-6">
                    {/* Cities & Areas targeting constraint */}
                    <div>
                        <label className={LABEL_CLASS}>{t('form.is_for_all_cities')}</label>
                        <OptionCards
                            value={isForAllCities ? 'all' : 'specific'}
                            onChange={(v) => setIsForAllCities(v === 'all')}
                            options={[
                                { value: 'all', label: t('details.all_cities'), desc: t('form.all_cities_desc') },
                                { value: 'specific', label: t('form.specific_cities_desc'), desc: t('form.specific_cities_desc') },
                            ]}
                        />

                        {!isForAllCities && (
                            <div className="mt-3 space-y-4 bg-gray-50/50 p-4 border border-gray-100 rounded-xl">
                                {/* Cities checklist */}
                                <div>
                                    <span className="block text-xs font-bold text-gray-700 mb-2">{t('details.all_cities')}</span>
                                    <div className="flex flex-wrap gap-3">
                                        {cities.map((city) => {
                                            const checked = selectedCityIds.includes(city.id);
                                            return (
                                                <label key={city.id} className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                                                    <input 
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleCity(city.id)}
                                                        className="w-4 h-4 rounded text-[#E91E63] border-gray-300 focus:ring-[#E91E63]"
                                                    />
                                                    <span>{isArabic ? city.name_ar : city.name_en}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Areas checklist (filtered to chosen cities) */}
                                {selectedCityIds.length > 0 && (
                                    <div className="pt-3 border-t border-gray-100">
                                        <span className="block text-xs font-bold text-gray-700 mb-2">{t('details.areas', { count: selectedAreaIds.length })}</span>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-36 overflow-y-auto pr-1">
                                            {areas
                                                .filter(a => selectedCityIds.includes(a.city_id))
                                                .map((area) => {
                                                    const checked = selectedAreaIds.includes(area.id);
                                                    return (
                                                        <label key={area.id} className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer p-1 border border-transparent hover:border-gray-100 rounded">
                                                            <input 
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => toggleArea(area.id)}
                                                                className="w-4 h-4 rounded text-[#E91E63] border-gray-300 focus:ring-[#E91E63]"
                                                            />
                                                            <span className="truncate">{isArabic ? area.name_ar : area.name_en}</span>
                                                        </label>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* User targeting constraint */}
                    <div>
                        <label className={LABEL_CLASS}>{t('form.is_for_all_users')}</label>
                        <OptionCards
                            value={isForAllUsers ? 'all' : 'specific'}
                            onChange={(v) => setIsForAllUsers(v === 'all')}
                            options={[
                                { value: 'all', label: t('details.all_users'), desc: t('form.all_users_desc') },
                                { value: 'specific', label: t('form.specific_users_desc'), desc: t('form.specific_users_desc') },
                            ]}
                        />

                        {!isForAllUsers && (
                            <div className="mt-3 space-y-3 bg-gray-50/50 p-4 border border-gray-100 rounded-xl">
                                <div className="relative">
                                    <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400 pointer-events-none">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </span>
                                    <input 
                                        type="text" 
                                        value={userSearch} 
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        placeholder={isArabic ? 'ابحث بالاسم، البريد أو رقم الجوال...' : 'Search customer by name, email or mobile number...'}
                                        className="w-full ps-9 pe-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#E91E63] bg-white"
                                    />
                                    {userSearchResults.length > 0 && (
                                        <ul className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-lg shadow-lg divide-y divide-gray-50">
                                            {userSearchResults.map((u) => {
                                                const uName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || `User ID: ${u.id}`;
                                                return (
                                                    <li 
                                                        key={u.id} 
                                                        onClick={() => handleAddUser(u)}
                                                        className="px-4 py-2 hover:bg-[#FDF0F3] hover:text-[#E91E63] cursor-pointer text-xs flex flex-col gap-0.5 text-start"
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-semibold text-gray-800">{uName}</span>
                                                            {u.phone_number && <span className="text-gray-500 font-medium text-[10px]">{u.phone_number}</span>}
                                                        </div>
                                                        {u.email && <span className="text-gray-400 text-[10px] block text-start">{u.email}</span>}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>

                                {/* selected users list */}
                                {selectedUserIds.length > 0 && (
                                    <div className="max-h-40 overflow-y-auto space-y-1.5 pt-2">
                                        {selectedUserIds.map((userId) => {
                                            const uObj = fullCoupon?.users?.find(x => x.id === userId) || userSearchResults.find(x => x.id === userId);
                                            const uName = uObj?.name || `${uObj?.first_name || ''} ${uObj?.last_name || ''}`.trim() || `User ID: ${userId}`;
                                            return (
                                                <div key={userId} className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 text-xs">
                                                    <div className="min-w-0 text-start">
                                                        <span className="font-semibold text-gray-800 truncate block">{uName}</span>
                                                        <div className="text-[10px] text-gray-400 flex flex-col gap-0.5 mt-0.5">
                                                            {uObj?.phone_number && <span className="block">{uObj.phone_number}</span>}
                                                            {uObj?.email && <span className="block">{uObj.email}</span>}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveUser(userId)}
                                                        className="text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded"
                                                    >
                                                        {t('form.service_settings.remove')}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </FormSection>

            {/* Section 4: Services targeting constraint */}
            <FormSection icon="sparkles" title={t('details.service_constraints')}>
                <div className="space-y-4">
                    <label className={LABEL_CLASS}>{t('form.is_for_all_services')}</label>
                    <OptionCards
                        value={isForAllServices ? 'all' : 'specific'}
                        onChange={(v) => setIsForAllServices(v === 'all')}
                        options={[
                            { value: 'all', label: t('details.all_services'), desc: t('form.all_services_desc') },
                            { value: 'specific', label: t('form.specific_services_desc'), desc: t('form.specific_services_desc') },
                        ]}
                    />

                    {!isForAllServices && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-gray-50/50 p-4 border border-gray-100 rounded-xl max-h-[500px] overflow-y-auto">
                            {/* Left: select services */}
                            <div className="space-y-2">
                                <span className="block text-xs font-bold text-gray-700 mb-1">{isArabic ? 'اختر الخدمات المشمولة' : 'Select Eligible Services'}</span>
                                <div className="border border-gray-100 rounded-lg max-h-60 overflow-y-auto divide-y divide-gray-50 bg-white shadow-sm">
                                    {services.map((s) => {
                                        const checked = selectedServices.some(item => item.id === s.id);
                                        return (
                                            <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
                                                <input 
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleServiceCheckbox(s)}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#E91E63] focus:ring-[#E91E63]"
                                                />
                                                <span className="truncate">{isArabic ? s.name_ar : s.name_en}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right: configure rules for chosen services */}
                            <div className="space-y-3">
                                <span className="block text-xs font-bold text-gray-700 mb-1">{isArabic ? 'تهيئة شروط الخدمات المختارة' : 'Configure Selected Service Rules'}</span>
                                {selectedServices.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic pt-6 text-center">{isArabic ? 'لم يتم اختيار أي خدمة لتخصيصها.' : 'No services selected for customization.'}</p>
                                ) : (
                                    <div className="space-y-4">
                                        {selectedServices.map((selS) => (
                                            <div key={selS.id} className="p-3 border border-gray-200 rounded-xl bg-white shadow-sm space-y-3">
                                                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                                    <span className="text-xs font-bold text-gray-800">{isArabic ? services.find(x => x.id === selS.id)?.name_ar : services.find(x => x.id === selS.id)?.name_en}</span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => toggleServiceCheckbox(selS)}
                                                        className="text-[10px] text-red-500 hover:text-red-700"
                                                    >
                                                        {t('form.service_settings.remove')}
                                                    </button>
                                                </div>

                                                {/* Allowed visit types */}
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase">{t('form.service_settings.select_types')}</label>
                                                    <div className="flex gap-4">
                                                        <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                                                            <input 
                                                                type="checkbox"
                                                                checked={selS.allowed_visit_types.includes('single_visit')}
                                                                onChange={() => toggleServiceVisitType(selS.id, 'single_visit')}
                                                                className="w-3.5 h-3.5 rounded text-[#E91E63] border-gray-300"
                                                            />
                                                            <span>{isArabic ? 'زيارة واحدة' : 'Single Visit'}</span>
                                                        </label>
                                                        {selS.id !== 2 && selS.id !== 3 && (
                                                            <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={selS.allowed_visit_types.includes('three_visits_per_week') || selS.allowed_visit_types.includes('3_days_per_week')}
                                                                    onChange={() => toggleServiceVisitType(selS.id, 'three_visits_per_week')}
                                                                    className="w-3.5 h-3.5 rounded text-[#E91E63] border-gray-300"
                                                                />
                                                                <span>{isArabic ? '٣ زيارات / أسبوع' : '3 Visits/Week'}</span>
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </FormSection>
        </FullScreenFormModal>
    );
}
