import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { INPUT_CLASS, LABEL_CLASS, SelectField, OptionCards, FormSection } from '../../components/form/FormKit';

// Weekly days options
const WEEK_DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DEFAULT_START_TIME = '09:00';

const calculateEndTime = (startTimeStr, durationHours) => {
    if (!startTimeStr || !durationHours) return '';
    try {
        const [h, m] = startTimeStr.split(':').map(Number);
        const totalMinutes = h * 60 + m + Math.round(Number(durationHours) * 60);
        const endH = Math.floor(totalMinutes / 60) % 24;
        const endM = totalMinutes % 60;
        return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    } catch {
        return '';
    }
};



export default function ServiceFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { t, i18n } = useTranslation('services');
    const isEditMode = !!id;
    const isArabic = i18n.language === 'ar';
    const [activeTab, setActiveTab] = useState('basic');
    const [selectedZoneIds, setSelectedZoneIds] = useState([]);

    // Filterable Workers Picker
    const [workerSearchInput, setWorkerSearchInput] = useState('');
    const [workerSearch, setWorkerSearch] = useState('');
    const [workerGenderFilter, setWorkerGenderFilter] = useState('all');
    const [workerFilterTab, setWorkerFilterTab] = useState('all');
    useEffect(() => {
        const timerId = setTimeout(() => setWorkerSearch(workerSearchInput), 400);
        return () => clearTimeout(timerId);
    }, [workerSearchInput]);
    // Fetch Details for Editing
    const { data: fullServiceData, isLoading: isServiceLoading } = useQuery({
        queryKey: ['serviceDetailsPage', id],
        queryFn: async () => (await axiosInstance.get(`/admin/services/${id}`)).data.data,
        enabled: isEditMode,
    });

    // Fetch categories list
    const { data: categories = [] } = useQuery({
        queryKey: ['categoriesList'],
        queryFn: async () => (await axiosInstance.get('/admin/categories')).data.data.items || [],
    });
    
    // Fetch Geo-fenced Service Zones
    const { data: serviceZonesList = [] } = useQuery({
        queryKey: ['serviceZonesList'],
        queryFn: async () => {
            const res = (await axiosInstance.get('/admin/service-zones?per_page=100')).data;
            return res?.data?.items || res?.data || [];
        },
    });

    // Auto-select all zones in Create Mode
    useEffect(() => {
        if (!isEditMode && serviceZonesList.length > 0 && selectedZoneIds.length === 0) {
            setSelectedZoneIds(serviceZonesList.map(z => String(z.id)));
        }
    }, [isEditMode, serviceZonesList]);

    const schema = yup.object().shape({
        category_id: yup.string().nullable().notRequired(),
        type: yup.string().required(t('validation.required')),
        worker_gender_options: yup.mixed().test(
            'hosp_gender_required',
            isArabic ? 'يجب اختيار جنس عمالة واحد على الأقل (ذكور أو إناث)' : 'At least one worker gender option must be selected (Male or Female)',
            function (value) {
                const hosp = String(id) === '2' ||
                    this.parent.service_code === 'HOSPITALITY_WORKER_HOURLY' ||
                    (categories?.find((c) => String(c.id) === String(this.parent.category_id))?.name_en?.toLowerCase().includes('hospitality'));
                if (hosp) {
                    const arr = Array.isArray(value) ? value : (value ? [value] : []);
                    return arr.length >= 1;
                }
                return true;
            }
        ),
        pricing_type: yup.string().nullable().notRequired(),
        name_ar: yup.string().required(t('validation.required')).max(100),
        name_en: yup.string().required(t('validation.required')).max(100),
        description_ar: yup.string().required(t('validation.required')).max(500),
        description_en: yup.string().required(t('validation.required')).max(500),
        status: yup.string().required(t('validation.required')),
        service_code: yup.string().nullable().max(50),
        base_price: yup.number()
            .transform((value) => (isNaN(value) ? undefined : value))
            .nullable()
            .test(
                'base_price_positive_for_core',
                isArabic ? 'السعر الأساسي يجب أن يكون أكبر من 0 للخدمات من 1 إلى 5 ولا يمكن أن يكون 0' : 'Base price must be greater than 0 for services 1 to 5 and cannot be 0',
                function (value) {
                    const isCore = (Number(id) >= 1 && Number(id) <= 5) || [
                        'DOMESTIC_HELPER_HOURLY', 'HOSPITALITY_WORKER_HOURLY', 'BABYSITTER_HOURLY', 'PEDICURE_MANICURE', 'DEEP_CLEANING'
                    ].includes(this.parent?.service_code) || [
                        'DOMESTIC_HELPER_HOURLY', 'HOSPITALITY_WORKER_HOURLY', 'BABYSITTER_HOURLY', 'PEDICURE_MANICURE', 'DEEP_CLEANING'
                    ].includes(fullServiceData?.service_code) ||
                    this.parent?.type === 'hourly';

                    if (isCore) {
                        return value !== undefined && value !== null && Number(value) > 0;
                    }
                    return true;
                }
            )
            .min(0, isArabic ? 'السعر الأساسي لا يمكن أن يكون أقل من 0' : 'Base price cannot be less than 0')
            .max(99999999.99, isArabic ? 'السعر الأساسي لا يمكن أن يتجاوز 99,999,999.99' : 'Base price cannot exceed 99,999,999.99'),
        options: yup.array().of(
            yup.object().shape({
                name_ar: yup.string().required(t('validation.required')),
                name_en: yup.string().required(t('validation.required')),
                unit_price: yup.number().transform((val) => (isNaN(val) ? undefined : val)).required(t('validation.required')).min(0).max(99999999.99, isArabic ? 'سعر الوحدة لا يمكن أن يتجاوز 99,999,999.99' : 'Unit price cannot exceed 99,999,999.99'),
                min_qty: yup.number().transform((val) => (isNaN(val) ? undefined : val)).nullable().min(0).max(999999),
                max_qty: yup.number().transform((val) => (isNaN(val) ? undefined : val)).nullable().min(1).max(999999),
                status: yup.string().default('active'),
            })
        ).nullable(),
        
        single_visit_checked: yup.boolean(),
        three_days_checked: yup.boolean(),
        single_visit_discount: yup.number().transform((value) => (isNaN(value) ? undefined : value)).nullable().when('single_visit_checked', {
            is: true,
            then: (s) => s.required(t('validation.required')).min(0).max(100),
            otherwise: (s) => s.nullable(),
        }),
        three_days_discount: yup.number().transform((value) => (isNaN(value) ? undefined : value)).nullable().when('three_days_checked', {
            is: true,
            then: (s) => s.required(t('validation.required')).min(0).max(100),
            otherwise: (s) => s.nullable(),
        }),

        start_time: yup.string().nullable()
            .test('start_time_hosp', isArabic ? 'وقت البدء يجب أن يكون بين 8:00 ص و 8:00 م' : 'Start time must be between 8:00 AM and 8:00 PM for Hospitality Services', function(value) {
                if (!value) return true;
                const categoryId = this.parent.category_id;
                const selectedCat = categories?.find(c => String(c.id) === String(categoryId));
                const isHospitality = selectedCat && (selectedCat.name_en?.toLowerCase().includes('hospitality') || selectedCat.name_ar?.includes('ضيافة'));
                if (isHospitality && (value < '08:00' || value > '20:00')) return false;
                return true;
            }),
        end_time: yup.string().nullable()
            .test('end_time_hosp', isArabic ? 'وقت الانتهاء يجب أن يكون بين 8:00 ص و 8:00 م' : 'End time must be between 8:00 AM and 8:00 PM for Hospitality Services', function(value) {
                if (!value) return true;
                const categoryId = this.parent.category_id;
                const selectedCat = categories?.find(c => String(c.id) === String(categoryId));
                const isHospitality = selectedCat && (selectedCat.name_en?.toLowerCase().includes('hospitality') || selectedCat.name_ar?.includes('ضيافة'));
                if (isHospitality && (value < '08:00' || value > '20:00')) return false;
                return true;
            }),
        default_duration: yup.number().transform((value) => (isNaN(value) ? undefined : value)).required(t('validation.required')).min(1),
        
        min_duration: yup.number().transform((value) => (isNaN(value) ? undefined : value)).nullable().when('has_duration_range', {
            is: true,
            then: (s) => s.required(t('validation.required')).min(1)
                .test('min_duration_hosp', isArabic ? 'الحد الأدنى للمدة هو 4 ساعات للضيافة' : 'Minimum duration must be at least 4 hours for Hospitality Services', function(value) {
                    const categoryId = this.parent.category_id;
                    const selectedCat = categories?.find(c => String(c.id) === String(categoryId));
                    const isHospitality = selectedCat && (selectedCat.name_en?.toLowerCase().includes('hospitality') || selectedCat.name_ar?.includes('ضيافة'));
                    if (isHospitality && value < 4) return false;
                    return true;
                }),
            otherwise: (s) => s.nullable(),
        }),
        max_duration: yup.number().transform((value) => (isNaN(value) ? undefined : value)).nullable().when('has_duration_range', {
            is: true,
            then: (s) => s.required(t('validation.required')).min(1)
                .test('max_duration_hosp', isArabic ? 'الحد الأقصى للمدة هو 6 ساعات للضيافة' : 'Maximum duration must be at most 6 hours for Hospitality Services', function(value) {
                    const categoryId = this.parent.category_id;
                    const selectedCat = categories?.find(c => String(c.id) === String(categoryId));
                    const isHospitality = selectedCat && (selectedCat.name_en?.toLowerCase().includes('hospitality') || selectedCat.name_ar?.includes('ضيافة'));
                    if (isHospitality && value > 6) return false;
                    return true;
                })
                .test('max_greater', 'Max must be >= Min', function(value) {
                    const { min_duration } = this.parent;
                    return value >= min_duration;
                }),
            otherwise: (s) => s.nullable(),
        }),

        is_team_based: yup.boolean().nullable(),
        min_workers: yup.number().transform((value) => (isNaN(value) ? undefined : value))
            .when('is_team_based', {
                is: true,
                then: (s) => s.nullable(),
                otherwise: (s) => s.required(t('validation.required')).min(1),
            }),
        max_workers: yup.number().transform((value) => (isNaN(value) ? undefined : value))
            .when('is_team_based', {
                is: true,
                then: (s) => s.nullable(),
                otherwise: (s) => s.required(t('validation.required')).min(1)
                    .test('max_workers_hosp', isArabic ? 'الحد الأقصى لعدد العمالة هو 12 للضيافة' : 'Maximum workers must be at most 12 for Hospitality Services', function(value) {
                        const categoryId = this.parent.category_id;
                        const selectedCat = categories?.find(c => String(c.id) === String(categoryId));
                        const isHospitality = selectedCat && (selectedCat.name_en?.toLowerCase().includes('hospitality') || selectedCat.name_ar?.includes('ضيافة'));
                        if (isHospitality && value > 12) return false;
                        return true;
                    })
                    .test('max_workers_greater', 'Max workers must be >= Min workers', function(value) {
                        const { min_workers } = this.parent;
                        return !min_workers || value >= min_workers;
                    }),
            }),
        covered_persons_per_worker: yup.number().transform((value) => (isNaN(value) ? undefined : value)).nullable().min(1),
        min_children: yup.number().transform((value) => (isNaN(value) ? undefined : value)).nullable()
            .when('category_id', {
                is: (val) => {
                    const selectedCat = categories?.find(c => String(c.id) === String(val));
                    return selectedCat && (selectedCat.name_en?.toLowerCase().includes('babysitting') || selectedCat.name_ar?.includes('أطفال') || selectedCat.name_en?.toLowerCase().includes('babysitter'));
                },
                then: (s) => s.required(t('validation.required')).min(1),
                otherwise: (s) => s.nullable()
            }),
        max_children: yup.number().transform((value) => (isNaN(value) ? undefined : value)).nullable()
            .when('category_id', {
                is: (val) => {
                    const selectedCat = categories?.find(c => String(c.id) === String(val));
                    return selectedCat && (selectedCat.name_en?.toLowerCase().includes('babysitting') || selectedCat.name_ar?.includes('أطفال') || selectedCat.name_en?.toLowerCase().includes('babysitter'));
                },
                then: (s) => s.required(t('validation.required')).min(1)
                    .test('max_children_greater', isArabic ? 'الحد الأقصى يجب أن يكون أكبر من أو يساوي الحد الأدنى' : 'Max children must be >= Min children', function(value) {
                        const { min_children } = this.parent;
                        return value >= min_children;
                    }),
                otherwise: (s) => s.nullable()
            }),
        child_age_groups: yup.array().of(
            yup.object().shape({
                name_ar: yup.string().required(t('validation.required')),
                name_en: yup.string().required(t('validation.required')),
                age_from: yup.number().transform((value) => (isNaN(value) ? undefined : value)).required(t('validation.required')).min(0),
                age_to: yup.number().transform((value) => (isNaN(value) ? undefined : value)).required(t('validation.required')).min(0)
                    .test('age_to_greater', isArabic ? 'العمر الأقصى يجب أن يكون أكبر من أو يساوي الأدنى' : 'Age To must be >= Age From', function(value) {
                        const { age_from } = this.parent;
                        return value >= age_from;
                    }),
                calculation_type: yup.string().required(t('validation.required')).oneOf(['per_child', 'ratio_based']),
                children_count: yup.number().transform((value) => (isNaN(value) ? undefined : value)).required(t('validation.required')).min(1),
                required_worker_count: yup.number().transform((value) => (isNaN(value) ? undefined : value)).required(t('validation.required')).min(1),
                status: yup.string().required(t('validation.required')).oneOf(['active', 'inactive']),
            })
        )
        .test('no_age_overlap', isArabic ? 'توجد فئات عمرية متداخلة. يجب ألا تتداخل النطاقات العمرية للأطفال.' : 'Age groups must not overlap.', function(groups) {
            if (!Array.isArray(groups) || groups.length <= 1) return true;
            const activeGroups = groups
                .map((g, idx) => ({ ...g, origIndex: idx }))
                .filter(g => (g?.status || 'active') === 'active' && g?.age_from !== undefined && g?.age_to !== undefined);

            for (let i = 0; i < activeGroups.length; i++) {
                for (let j = i + 1; j < activeGroups.length; j++) {
                    const gA = activeGroups[i];
                    const gB = activeGroups[j];
                    const fromA = Number(gA.age_from);
                    const toA = Number(gA.age_to);
                    const fromB = Number(gB.age_from);
                    const toB = Number(gB.age_to);

                    if (fromA <= toA && fromB <= toB) {
                        if (fromA <= toB && fromB <= toA) {
                            const msg = isArabic 
                                ? `تداخل في الفئات العمرية: النطاق (${fromB} إلى ${toB} شهر) يتعارض مع النطاق (${fromA} إلى ${toA} شهر).`
                                : `Age group overlap: range (${fromB} to ${toB} months) overlaps with range (${fromA} to ${toA} months).`;
                            return this.createError({
                                path: `child_age_groups[${gB.origIndex}].age_from`,
                                message: msg,
                            });
                        }
                    }
                }
            }
            return true;
        })
        .test('babysitter_requires_active_age_group', isArabic ? 'يجب إدخال وتفعيل فئة عمرية واحدة للأطفال على الأقل لخدمة جليسة الأطفال.' : 'At least one active child age group must be configured for the Babysitter service.', function(groups) {
            const { category_id, service_code } = this.parent || {};
            const isBabysitService = (String(id) === '3') ||
                (service_code === 'BABYSITTER_HOURLY') ||
                (watchServiceCode === 'BABYSITTER_HOURLY') ||
                (fullServiceData?.service_code === 'BABYSITTER_HOURLY') ||
                (() => {
                    const selectedCat = categories?.find(c => String(c.id) === String(category_id));
                    return selectedCat && (
                        selectedCat.name_en?.toLowerCase().includes('babysitting') ||
                        selectedCat.name_en?.toLowerCase().includes('nanny') ||
                        selectedCat.name_ar?.includes('أطفال') ||
                        selectedCat.name_en?.toLowerCase().includes('babysitter')
                    );
                })();

            if (!isBabysitService) return true;

            if (!Array.isArray(groups) || groups.length === 0) {
                return false;
            }
            const activeGroups = groups.filter(g => (g?.status || 'active') === 'active');
            return activeGroups.length >= 1;
        })
        .nullable(),

        working_days: yup.array().of(yup.string()),
        shifts: yup.array().of(yup.object().shape({
            start_time: yup.string().nullable()
        })).nullable(),

        terms_ar: yup.string().nullable().max(5000),
        terms_en: yup.string().nullable().max(5000),

        workers: yup.array().of(yup.string()).nullable(),
        teams: yup.array().of(yup.string()).nullable(),

        rules: yup.object().shape({
            allow_cancel: yup.boolean(),
            free_cancel_cutoff_hours: yup.number().transform((value) => (isNaN(value) ? undefined : value)).nullable().when('allow_cancel', {
                is: true,
                then: (s) => s.required(t('validation.required')).min(0),
                otherwise: (s) => s.nullable(),
            }),
            allow_reschedule: yup.boolean(),
            reschedule_cutoff_hours: yup.number().transform((value) => (isNaN(value) ? undefined : value)).nullable().when('allow_reschedule', {
                is: true,
                then: (s) => s.required(t('validation.required')).min(0),
                otherwise: (s) => s.nullable(),
            }),
            allow_same_day: yup.boolean(),
            max_advance_booking_days: yup.number().transform((value) => (isNaN(value) ? undefined : value)).nullable().min(0),
            arrival_buffer_minutes: yup.number().transform((value) => (isNaN(value) ? undefined : value)).nullable().min(0),
            late_arrival_grace_minutes: yup.number().transform((value) => (isNaN(value) ? undefined : value)).nullable().min(0),
        })
    }).test('at-least-one-visit-type', function(value) {
        if (!value.single_visit_checked && !value.three_days_checked) {
            return this.createError({
                path: 'visit_types',
                message: isArabic ? 'يجب اختيار نوع زيارة واحد على الأقل' : 'At least one visit type must be selected'
            });
        }
        return true;
    });

    const { register, handleSubmit, watch, reset, setValue, setError, control, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            status: 'active',
            type: 'hourly',
            is_team_based: false,
            worker_gender_options: ['Female'],
            pricing_type: 'per_hour',
            single_visit_checked: false,
            single_visit_discount: 0,
            three_days_checked: false,
            three_days_discount: 0,
            base_price: '',
            start_time: '',
            end_time: '',
            default_duration: 4,
            has_duration_range: false,
            min_duration: 4,
            max_duration: 6,
            min_workers: 1,
            max_workers: 5,
            min_children: '',
            max_children: '',
            child_age_groups: [],
            options: [],
            working_days: [],
            shifts: [{ start_time: '09:00', end_time: '' }],
            features: [],
            terms_ar: '',
            terms_en: '',
            workers: [],
            teams: [],
            rules: {
                allow_cancel: false,
                free_cancel_cutoff_hours: '',
                allow_reschedule: false,
                reschedule_cutoff_hours: '',
                allow_same_day: false,
                max_advance_booking_days: '',
                arrival_buffer_minutes: 15,
                late_arrival_grace_minutes: 15,
            }
        },
    });

    const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({ control, name: 'features' });
    const { fields: shiftFields, append: appendShift, remove: removeShift } = useFieldArray({ control, name: 'shifts' });
    const { fields: childAgeGroupFields, append: appendChildAgeGroup, remove: removeChildAgeGroup } = useFieldArray({ control, name: 'child_age_groups' });
    const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({ control, name: 'options' });

    const watchType = watch('type');
    const watchHasDurationRange = watch('has_duration_range');
    const watchAllowCancel = watch('rules.allow_cancel');
    const watchAllowReschedule = watch('rules.allow_reschedule');
    const watchSingleVisitChecked = watch('single_visit_checked');
    const watchThreeDaysChecked = watch('three_days_checked');
    const statusValue = watch('status');
    const watchServiceCode = watch('service_code');

    const categoryId = watch('category_id');
    const selectedCategory = useMemo(() => categories.find((c) => String(c.id) === String(categoryId)), [categories, categoryId]);

    const isCoreService = (Number(id) >= 1 && Number(id) <= 5) || [
        'DOMESTIC_HELPER_HOURLY', 'HOSPITALITY_WORKER_HOURLY', 'BABYSITTER_HOURLY', 'PEDICURE_MANICURE', 'DEEP_CLEANING'
    ].includes(watchServiceCode) || [
        'DOMESTIC_HELPER_HOURLY', 'HOSPITALITY_WORKER_HOURLY', 'BABYSITTER_HOURLY', 'PEDICURE_MANICURE', 'DEEP_CLEANING'
    ].includes(fullServiceData?.service_code);

    const isBabysitting = (watchServiceCode === 'BABYSITTER_HOURLY') || (String(id) === '3') || (selectedCategory && (selectedCategory.name_en?.toLowerCase().includes('babysitting') || selectedCategory.name_en?.toLowerCase().includes('nanny') || selectedCategory.name_ar?.includes('أطفال') || selectedCategory.name_en?.toLowerCase().includes('babysitter')));
    const isPedicureManicure = (watchServiceCode === 'PEDICURE_MANICURE') || (String(id) === '4') || (selectedCategory && (selectedCategory.name_en?.toLowerCase().includes('pedicure') || selectedCategory.name_ar?.includes('أقدام')));
    const isHospitality = (watchServiceCode === 'HOSPITALITY_WORKER_HOURLY') || (String(id) === '2') || (selectedCategory && (selectedCategory.name_en?.toLowerCase().includes('hospitality') || selectedCategory.name_ar?.includes('ضيافة')));
    const isDeepCleaning = (watchServiceCode === 'DEEP_CLEANING') || (String(id) === '5') || (selectedCategory && (selectedCategory.name_en?.toLowerCase().includes('deep') || selectedCategory.name_ar?.includes('عميق')));
    const isOtherService = !isCoreService && !isPedicureManicure && !isHospitality && !isBabysitting && ((watchType === 'other') || (selectedCategory && (selectedCategory.name_en?.toLowerCase().includes('other') || selectedCategory.name_ar?.includes('أخرى') || selectedCategory.name_en?.toLowerCase().includes('deep') || selectedCategory.name_ar?.includes('عميق'))));
    const isSecondOrThirdService = isHospitality || isBabysitting || isPedicureManicure || isOtherService;
    const isSpecializedService = (Number(id) >= 6 && Number(id) <= 11) || (
        isOtherService && !isDeepCleaning
    ) || [
        'SOFA_CLEANING', 'WATER_TANK_CLEANING', 'STAIRS_SURFACES_CLEANING', 'AC_CLEANING', 'CARPET_CLEANING', 'CAR_WASH'
    ].includes(watchServiceCode?.toUpperCase());
    const watchIsTeamBased = watch('is_team_based');
    const isTeamBasedService = isSpecializedService ? !!watchIsTeamBased : false;

    // Fetch Teams list for services 6 to 11
    const { data: teamsList = [], isLoading: isTeamsLoading } = useQuery({
        queryKey: ['teams-list-for-service'],
        queryFn: async () => {
            const res = await axiosInstance.get('/admin/teams?status=active');
            return res.data?.data?.items || [];
        },
    });

    // Determine which genders are allowed for this service
    const watchGenderOptions = watch('worker_gender_options');
    const serviceAllowedGenders = useMemo(() => {
        if (isPedicureManicure || isBabysitting || watchServiceCode === 'DOMESTIC_HELPER_HOURLY' || String(id) === '1' || String(id) === '3' || String(id) === '4') {
            return ['Female'];
        }
        if (isDeepCleaning || watchServiceCode === 'DEEP_CLEANING' || String(id) === '5') {
            return ['Male'];
        }
        if (isSpecializedService || isTeamBasedService) {
            return ['Male'];
        }
        if (Array.isArray(watchGenderOptions) && watchGenderOptions.length > 0) {
            return watchGenderOptions;
        }
        if (isHospitality) {
            return ['Female', 'Male'];
        }
        return ['Male', 'Female'];
    }, [isPedicureManicure, isBabysitting, watchServiceCode, id, isDeepCleaning, isSpecializedService, isTeamBasedService, watchGenderOptions, isHospitality]);

    const activeWorkerGenderParam = useMemo(() => {
        if (serviceAllowedGenders.length === 1) {
            return serviceAllowedGenders[0];
        }
        if (workerGenderFilter === 'Male' || workerGenderFilter === 'Female') {
            return workerGenderFilter;
        }
        return null; // 'all'
    }, [serviceAllowedGenders, workerGenderFilter]);

    // Filterable Workers Picker (fetches active workers matching gender parameter)
    const {
        data: workersResp,
        isLoading: isWorkersLoading,
    } = useQuery({
        queryKey: ['service-form-workers', activeWorkerGenderParam],
        queryFn: async () => {
            const params = new URLSearchParams({ 
                per_page: '250', 
                status: 'active',
            });
            if (activeWorkerGenderParam) {
                params.append('gender', activeWorkerGenderParam);
            }
            const res = await axiosInstance.get(`/admin/workers?${params.toString()}`);
            return res.data?.data?.items || [];
        },
    });

    const watchedWorkers = watch('workers');
    const selectedWorkerIds = useMemo(() => {
        return Array.isArray(watchedWorkers) ? watchedWorkers.map(String) : [];
    }, [watchedWorkers]);

    // All workers combined with fullServiceData.workers
    const allWorkers = useMemo(() => {
        let list = [...(workersResp || [])];
        if (fullServiceData?.workers && Array.isArray(fullServiceData.workers)) {
            const existingIds = new Set(list.map(w => String(w.id)));
            for (const sw of fullServiceData.workers) {
                if (!existingIds.has(String(sw.id))) {
                    list.unshift({
                        ...sw,
                        assigned_services: sw.assigned_services || [{ id: Number(id), name_ar: fullServiceData.name_ar, name_en: fullServiceData.name_en }]
                    });
                    existingIds.add(String(sw.id));
                }
            }
        }
        return list;
    }, [workersResp, fullServiceData?.workers, id]);

    // Filter out workers assigned to other services: only display employees who can handle this service (current assigned + unassigned available)
    const eligibleWorkers = useMemo(() => {
        return allWorkers.filter((worker) => {
            const workerServices = (worker.assigned_services?.length
                ? worker.assigned_services
                : (worker.services?.length
                    ? worker.services
                    : (worker.assigned_service ? [worker.assigned_service] : [])));
            const isAssignedToThis = id && workerServices.some(s => Number(s.id) === Number(id));
            const isSelected = selectedWorkerIds.includes(String(worker.id));
            const isUnassigned = workerServices.length === 0;

            // Only display employees who can handle this service (assigned to this service or unassigned)
            return isAssignedToThis || isSelected || isUnassigned;
        });
    }, [allWorkers, id, selectedWorkerIds]);

    // Tab Counts
    const workerCounts = useMemo(() => {
        let all = eligibleWorkers.length;
        let unassigned = 0;
        let assigned = 0;

        eligibleWorkers.forEach((worker) => {
            const workerServices = (worker.assigned_services?.length
                ? worker.assigned_services
                : (worker.services?.length
                    ? worker.services
                    : (worker.assigned_service ? [worker.assigned_service] : [])));
            const isAssignedToThis = id && workerServices.some(s => Number(s.id) === Number(id));
            const isSelected = selectedWorkerIds.includes(String(worker.id));

            if (workerServices.length === 0 && !isSelected) {
                unassigned++;
            } else if (isAssignedToThis || isSelected) {
                assigned++;
            }
        });

        return { all, unassigned, assigned };
    }, [eligibleWorkers, id, selectedWorkerIds]);

    // Filtered Workers List
    const workersList = useMemo(() => {
        return eligibleWorkers.filter((worker) => {
            const workerServices = (worker.assigned_services?.length
                ? worker.assigned_services
                : (worker.services?.length
                    ? worker.services
                    : (worker.assigned_service ? [worker.assigned_service] : [])));
            const isAssignedToThis = id && workerServices.some(s => Number(s.id) === Number(id));
            const isSelected = selectedWorkerIds.includes(String(worker.id));

            // Tab filter: 'all' | 'unassigned' | 'assigned'
            if (workerFilterTab === 'unassigned') {
                if (workerServices.length > 0 || isSelected) return false;
            } else if (workerFilterTab === 'assigned') {
                if (!isAssignedToThis && !isSelected) return false;
            }

            // Search filter
            if (workerSearchInput && workerSearchInput.trim()) {
                const term = workerSearchInput.trim().toLowerCase();
                const nameMatch = worker.name?.toLowerCase().includes(term);
                const nationalityMatch = worker.nationality?.toLowerCase().includes(term);
                const phoneMatch = worker.phone_number?.toLowerCase().includes(term);
                const serviceMatch = workerServices.some(s => 
                    s.name_ar?.toLowerCase().includes(term) || s.name_en?.toLowerCase().includes(term)
                );
                if (!nameMatch && !nationalityMatch && !phoneMatch && !serviceMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [eligibleWorkers, workerFilterTab, selectedWorkerIds, workerSearchInput, id]);

    const areAllVisibleSelected = useMemo(() => {
        if (workersList.length === 0) return false;
        return workersList.every(w => selectedWorkerIds.includes(String(w.id)));
    }, [workersList, selectedWorkerIds]);

    const handleSelectAllVisible = () => {
        const visibleIds = workersList.map(w => String(w.id));
        const merged = Array.from(new Set([...selectedWorkerIds, ...visibleIds]));
        setValue('workers', merged, { shouldValidate: true, shouldDirty: true });
    };

    const handleDeselectAllVisible = () => {
        const visibleIdSet = new Set(workersList.map(w => String(w.id)));
        const newSelection = selectedWorkerIds.filter(id => !visibleIdSet.has(id));
        setValue('workers', newSelection, { shouldValidate: true, shouldDirty: true });
    };

    useEffect(() => {
        if (isHospitality) {
            setValue('single_visit_checked', true);
            setValue('three_days_checked', false);
            setValue('has_duration_range', true);
        } else if (isPedicureManicure) {
            setValue('single_visit_checked', true);
            setValue('three_days_checked', false);
            setValue('has_duration_range', false);
            setValue('default_duration', 2);
        } else if (isOtherService) {
            setValue('single_visit_checked', true);
            setValue('three_days_checked', false);
            setValue('has_duration_range', false);
            setValue('pricing_type', 'per_service');
            if (!watch('worker_gender_options')?.length) {
                setValue('worker_gender_options', ['Male']);
            }
            if (!isEditMode && !isDeepCleaning) {
                setValue('base_price', 0);
                setValue('min_workers', 1);
                setValue('max_workers', 1);
            }
        }
    }, [isHospitality, isBabysitting, isPedicureManicure, isOtherService, isDeepCleaning, isEditMode, setValue]);

    // Handle Image Preview
    const imageList = watch('image');
    const [imagePreview, setImagePreview] = useState(null);
    useEffect(() => {
        if (imageList && imageList[0] instanceof File) {
            const url = URL.createObjectURL(imageList[0]);
            setImagePreview(url);
            return () => URL.revokeObjectURL(url);
        }
        setImagePreview(null);
    }, [imageList]);

    // Populate edit data
    useEffect(() => {
        if (isEditMode && fullServiceData) {
            const singleVisit = (fullServiceData.available_visit_types || []).find(vt => vt.type === 'single_visit');
            const threeDays = (fullServiceData.available_visit_types || []).find(vt => vt.type === '3_days_per_week');
            const isServiceOneToFive = (Number(id) >= 1 && Number(id) <= 5) || [
                'DOMESTIC_HELPER_HOURLY', 'HOSPITALITY_WORKER_HOURLY', 'BABYSITTER_HOURLY', 'PEDICURE_MANICURE', 'DEEP_CLEANING'
            ].includes(fullServiceData.service_code);
            const serviceIsOther = !isServiceOneToFive && ((fullServiceData.type === 'other') || (Number(id) >= 6));

            // Map working days from schedules or available_days
            let workingDaysSet = [];
            if (fullServiceData.available_days && fullServiceData.available_days.length > 0) {
                workingDaysSet = fullServiceData.available_days;
            } else {
                const workingDays = (fullServiceData.schedules || [])
                    .filter((s) => s.is_active)
                    .map((s) => s.day);
                workingDaysSet = Array.from(new Set(workingDays));
            }

            // Map shift times from available_shifts or schedules
            let shifts = [];
            if (Array.isArray(fullServiceData.available_shifts)) {
                shifts = fullServiceData.available_shifts.map(sh => ({
                    start_time: sh.start_time?.slice(0, 5) || '',
                    end_time: sh.end_time?.slice(0, 5) || ''
                }));
            } else if (fullServiceData.schedules && fullServiceData.schedules.length > 0) {
                const shiftTimes = {};
                (fullServiceData.schedules || []).forEach((sch) => {
                    if (sch.is_active && sch.start_time) {
                        const sTime = sch.start_time.slice(0, 5);
                        const eTime = sch.end_time ? sch.end_time.slice(0, 5) : '';
                        shiftTimes[sTime] = eTime;
                    }
                });
                const mapped = Object.keys(shiftTimes).map((sTime) => ({ start_time: sTime, end_time: shiftTimes[sTime] }));
                if (mapped.length > 1 || (mapped.length === 1 && (mapped[0].start_time !== '08:00' || mapped[0].end_time !== '20:00'))) {
                    shifts = mapped;
                }
            }

            const rawZoneIds = Array.isArray(fullServiceData.service_zone_ids)
                ? fullServiceData.service_zone_ids
                : (fullServiceData.service_zones || []).map(z => z.id);
            setSelectedZoneIds((rawZoneIds || []).map(String));

            reset({
                category_id: fullServiceData.category?.id ? String(fullServiceData.category.id) : '',
                type: fullServiceData.type || 'hourly',
                name_ar: fullServiceData.name_ar || '',
                name_en: fullServiceData.name_en || '',
                description_ar: fullServiceData.description_ar || '',
                description_en: fullServiceData.description_en || '',
                status: fullServiceData.status || 'active',
                service_code: fullServiceData.service_code || '',
                
                base_price: isServiceOneToFive
                    ? (fullServiceData.base_price !== null && fullServiceData.base_price !== undefined ? fullServiceData.base_price : '')
                    : ((serviceIsOther && fullServiceData.service_code !== 'DEEP_CLEANING') ? 0 : (fullServiceData.base_price || '')),
                
                single_visit_checked: serviceIsOther ? true : !!singleVisit,
                single_visit_discount: singleVisit ? singleVisit.discount : 0,
                three_days_checked: serviceIsOther ? false : !!threeDays,
                three_days_discount: threeDays ? threeDays.discount : 0,
                
                
                start_time: fullServiceData.start_time ? fullServiceData.start_time.slice(0, 5) : '',
                end_time: fullServiceData.end_time ? fullServiceData.end_time.slice(0, 5) : '',
                default_duration: fullServiceData.default_duration || 1,
                has_duration_range: (String(id) === '2' || String(id) === '3') ? true : !!fullServiceData.has_duration_range,
                min_duration: fullServiceData.min_duration || '',
                max_duration: fullServiceData.max_duration || '',
                min_workers: fullServiceData.min_workers || 1,
                max_workers: fullServiceData.max_workers || 1,
                is_team_based: (fullServiceData.is_team_based !== undefined && fullServiceData.is_team_based !== null)
                    ? (fullServiceData.is_team_based === true || fullServiceData.is_team_based === 1 || fullServiceData.is_team_based === '1' || fullServiceData.is_team_based === 'true')
                    : ((Number(id) >= 6 && Number(id) <= 11) || (serviceIsOther && fullServiceData.service_code !== 'DEEP_CLEANING')),
                min_children: fullServiceData.min_children || '',
                max_children: fullServiceData.max_children || '',
                child_age_groups: fullServiceData.child_age_groups || [],
                options: (fullServiceData.options || []).map(opt => ({
                    id: opt.id,
                    name_ar: opt.name_ar || '',
                    name_en: opt.name_en || '',
                    unit_price: opt.unit_price ?? '',
                    min_qty: opt.min_qty ?? 1,
                    max_qty: opt.max_qty ?? 10,
                    status: opt.status || 'active',
                })),
                
                working_days: workingDaysSet,
                shifts: shifts.length ? shifts : (isHospitality || isBabysitting || isPedicureManicure ? [] : [{ start_time: '09:00', end_time: '' }]),
                
                features: (fullServiceData.features || []).map((f) => ({ ar: f.ar || '', en: f.en || '' })),
                terms_ar: fullServiceData.terms_ar || '',
                terms_en: fullServiceData.terms_en || '',
                worker_gender_options: fullServiceData.worker_gender_options || ['Female'],
                pricing_type: serviceIsOther ? 'per_service' : (fullServiceData.pricing_type || 'per_hour'),
                
                workers: fullServiceData.workers?.map((w) => String(w.id)) || [],
                teams: (fullServiceData.teams || []).map((t) => String(t.id)),
                rules: {
                    allow_cancel: !!fullServiceData.rules?.allow_cancel,
                    free_cancel_cutoff_hours: fullServiceData.rules?.free_cancel_cutoff_hours ?? '',
                    allow_reschedule: !!fullServiceData.rules?.allow_reschedule,
                    reschedule_cutoff_hours: fullServiceData.rules?.reschedule_cutoff_hours ?? '',
                    allow_same_day: !!fullServiceData.rules?.allow_same_day,
                    max_advance_booking_days: fullServiceData.rules?.max_advance_booking_days ?? '',
                    arrival_buffer_minutes: fullServiceData.rules?.arrival_buffer_minutes ?? 15,
                    late_arrival_grace_minutes: fullServiceData.rules?.late_arrival_grace_minutes ?? 15,
                }
            });
        }
    }, [fullServiceData, isEditMode, reset, id]);

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const payload = new FormData();
            if (isEditMode) payload.append('_method', 'PUT');

            payload.append('category_id', data.category_id || '');
            payload.append('name_ar', data.name_ar);
            payload.append('name_en', data.name_en);
            payload.append('description_ar', data.description_ar);
            payload.append('description_en', data.description_en);
            payload.append('type', data.type || fullServiceData?.type || 'hourly');
            payload.append('status', data.status);
            if (data.service_code) payload.append('service_code', data.service_code);

            if (isHospitality) {
                if (data.worker_gender_options && data.worker_gender_options.length > 0) {
                    data.worker_gender_options.forEach((gender) => {
                        payload.append('worker_gender_options[]', gender);
                    });
                } else {
                    payload.append('worker_gender_options', '');
                }
            } else if (data.worker_gender_options && data.worker_gender_options.length > 0) {
                data.worker_gender_options.forEach((gender) => {
                    payload.append('worker_gender_options[]', gender);
                });
            }

            if (data.image && data.image[0] instanceof File) {
                payload.append('image', data.image[0]);
            }

            payload.append('base_price', (isCoreService || !isOtherService || isDeepCleaning) ? (data.base_price ?? 0) : '0');
            if (isOtherService) {
                payload.append('pricing_type', 'per_service');
            } else if (isSecondOrThirdService && data.pricing_type) {
                payload.append('pricing_type', data.pricing_type);
            }

            // Visit Types
            let vtIndex = 0;
            if (data.single_visit_checked || isOtherService) {
                payload.append(`available_visit_types[${vtIndex}][type]`, 'single_visit');
                const discVal = (data.single_visit_discount === '' || data.single_visit_discount == null) ? 0 : data.single_visit_discount;
                payload.append(`available_visit_types[${vtIndex}][discount]`, String(discVal));
                vtIndex++;
            }
            if (!isHospitality && !isBabysitting && !isPedicureManicure && !isOtherService && data.three_days_checked) {
                payload.append(`available_visit_types[${vtIndex}][type]`, '3_days_per_week');
                const discVal = (data.three_days_discount === '' || data.three_days_discount == null) ? 0 : data.three_days_discount;
                payload.append(`available_visit_types[${vtIndex}][discount]`, String(discVal));
                vtIndex++;
            }

            // Service Zones
            if (!selectedZoneIds || selectedZoneIds.length === 0) {
                payload.append('service_zone_ids', '');
            } else {
                selectedZoneIds.forEach((zid, i) => {
                    payload.append(`service_zone_ids[${i}]`, zid);
                });
            }

            // Start & End Windows
            if (data.start_time) payload.append('start_time', data.start_time);
            if (data.end_time) payload.append('end_time', data.end_time);
            payload.append('default_duration', data.default_duration);
            const isForcedRange = String(id) === '2' || String(id) === '3';
            const hasRange = isForcedRange || data.has_duration_range;
            payload.append('has_duration_range', hasRange ? '1' : '0');
            if (hasRange) {
                if (data.min_duration) payload.append('min_duration', data.min_duration);
                if (data.max_duration) payload.append('max_duration', data.max_duration);
            }
            if (isSpecializedService) {
                payload.append('is_team_based', isTeamBasedService ? '1' : '0');
            } else {
                payload.append('is_team_based', '0');
            }
            if (!isTeamBasedService) {
                payload.append('min_workers', data.min_workers || 1);
                payload.append('max_workers', data.max_workers || data.min_workers || 1);
            }
            if (data.min_children !== undefined && data.min_children !== null && data.min_children !== '') {
                payload.append('min_children', String(data.min_children));
            }
            if (data.max_children !== undefined && data.max_children !== null && data.max_children !== '') {
                payload.append('max_children', String(data.max_children));
            }
            if (data.child_age_groups && data.child_age_groups.length) {
                data.child_age_groups.forEach((group, index) => {
                    payload.append('child_age_groups[' + index + '][name_ar]', group.name_ar);
                    payload.append('child_age_groups[' + index + '][name_en]', group.name_en);
                    payload.append('child_age_groups[' + index + '][age_from]', String(group.age_from));
                    payload.append('child_age_groups[' + index + '][age_to]', String(group.age_to));
                    payload.append('child_age_groups[' + index + '][calculation_type]', group.calculation_type);
                    payload.append('child_age_groups[' + index + '][children_count]', String(group.children_count || 1));
                    payload.append('child_age_groups[' + index + '][required_worker_count]', String(group.required_worker_count || 1));
                    payload.append('child_age_groups[' + index + '][status]', group.status || 'active');
                });
            } else if (isBabysitting) {
                payload.append('child_age_groups', '');
            }

            if (data.options && data.options.length) {
                data.options.forEach((opt, index) => {
                    if (opt.id) payload.append(`options[${index}][id]`, String(opt.id));
                    payload.append(`options[${index}][name_ar]`, opt.name_ar || '');
                    payload.append(`options[${index}][name_en]`, opt.name_en || '');
                    payload.append(`options[${index}][unit_price]`, String(opt.unit_price ?? 0));
                    payload.append(`options[${index}][min_qty]`, String(opt.min_qty ?? 1));
                    payload.append(`options[${index}][max_qty]`, String(opt.max_qty ?? 10));
                    payload.append(`options[${index}][status]`, opt.status || 'active');
                });
            }

            // Working Days
            (data.working_days || []).forEach((day) => {
                payload.append('working_days[]', day);
            });

            // Shifts (Only send for services that use discrete shifts)
            if (!isHospitality && !isBabysitting && !isPedicureManicure) {
                (data.shifts || []).forEach((shift, i) => {
                    if (shift.start_time) {
                        payload.append(`shifts[${i}][start_time]`, shift.start_time);
                        const endTime = calculateEndTime(shift.start_time, data.default_duration);
                        payload.append(`shifts[${i}][end_time]`, endTime || '');
                    }
                });
            }

            // Features
            let featureIndex = 0;
            (data.features || []).forEach((f) => {
                if (!f.ar && !f.en) return;
                if (f.ar) payload.append(`features[${featureIndex}][ar]`, f.ar);
                if (f.en) payload.append(`features[${featureIndex}][en]`, f.en);
                featureIndex++;
            });

            // Terms
            payload.append('terms_ar', data.terms_ar || '');
            payload.append('terms_en', data.terms_en || '');

            // Teams for Services 6 to 11 OR Workers for Services 1 to 5
            if (isTeamBasedService) {
                if (data.teams && data.teams.length > 0) {
                    data.teams.forEach((tId) => {
                        payload.append('teams[]', tId);
                    });
                } else {
                    payload.append('teams', '');
                }
            } else {
                if (!data.workers || data.workers.length === 0) {
                    payload.append('workers', '');
                } else {
                    data.workers.forEach((wId) => {
                        payload.append('workers[]', wId);
                    });
                }
            }

            // Rules
            const appendRule = (key, val) => {
                if (val !== undefined && val !== null && val !== '') {
                    payload.append(`rules[${key}]`, val);
                }
            };
            payload.append('rules[allow_cancel]', data.rules?.allow_cancel ? '1' : '0');
            appendRule('free_cancel_cutoff_hours', data.rules?.free_cancel_cutoff_hours);
            payload.append('rules[allow_reschedule]', data.rules?.allow_reschedule ? '1' : '0');
            appendRule('reschedule_cutoff_hours', data.rules?.reschedule_cutoff_hours);
            payload.append('rules[allow_same_day]', data.rules?.allow_same_day ? '1' : '0');
            appendRule('max_advance_booking_days', data.rules?.max_advance_booking_days);
            appendRule('arrival_buffer_minutes', data.rules?.arrival_buffer_minutes);
            appendRule('late_arrival_grace_minutes', data.rules?.late_arrival_grace_minutes);

            const url = isEditMode ? `/admin/services/${id}` : '/admin/services';
            return axiosInstance.post(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || 'تمت العملية بنجاح');
            queryClient.invalidateQueries({ queryKey: ['services'] });
            queryClient.invalidateQueries({ queryKey: ['serviceDetailsPage'] });
            navigate('/services');
        },
        onError: (error) => {
            const respData = error.response?.data;
            const validationErrors = respData?.errors || respData?.params;

            const fieldToTabMap = {
                name_ar: 'basic',
                name_en: 'basic',
                description_ar: 'basic',
                description_en: 'basic',
                type: 'basic',
                worker_gender_options: 'basic',
                base_price: 'locations',
                default_duration: 'durations',
                min_duration: 'durations',
                max_duration: 'durations',
                min_workers: 'durations',
                max_workers: 'durations',
                min_children: 'durations',
                max_children: 'durations',
                child_age_groups: 'durations',
                shifts: 'shifts',
                rules: 'rules',
                workers: 'workers',
                teams: 'workers',
                is_team_based: 'durations',
            };

            if (validationErrors) {
                // Set the errors in react-hook-form
                Object.entries(validationErrors).forEach(([key, messages]) => {
                    const message = Array.isArray(messages) ? messages[0] : messages;
                    setError(key, { type: 'server', message });
                });

                // Show specific detailed error in toast
                const specificError = validationErrors.workers
                    ? (Array.isArray(validationErrors.workers) ? validationErrors.workers[0] : validationErrors.workers)
                    : (validationErrors.worker_gender_options
                        ? (Array.isArray(validationErrors.worker_gender_options) ? validationErrors.worker_gender_options[0] : validationErrors.worker_gender_options)
                        : (validationErrors.child_age_groups
                            ? (Array.isArray(validationErrors.child_age_groups) ? validationErrors.child_age_groups[0] : validationErrors.child_age_groups)
                            : (Array.isArray(Object.values(validationErrors)[0]) ? Object.values(validationErrors)[0][0] : Object.values(validationErrors)[0])));

                toast.error(specificError || respData?.message || (isArabic ? 'فشل التحقق من البيانات' : 'Validation failed'), { duration: 6000 });

                // Switch to error tab
                const firstErrKey = Object.keys(validationErrors)[0];
                let targetTab = fieldToTabMap[firstErrKey];
                if (!targetTab && firstErrKey?.startsWith('child_age_groups')) {
                    targetTab = 'durations';
                }
                if (targetTab) {
                    setActiveTab(targetTab);
                }
            } else {
                toast.error(respData?.message || (isArabic ? 'حدث خطأ أثناء حفظ البيانات.' : 'An error occurred while saving.'));
            }
        },
    });

    const onFormError = (formErrors) => {
        console.error('Form Validation Errors:', formErrors);
        const firstErrorKey = Object.keys(formErrors)[0];
        
        const fieldToTabMap = {
            name_ar: 'basic',
            name_en: 'basic',
            description_ar: 'basic',
            description_en: 'basic',
            type: 'basic',
            worker_gender_options: 'basic',
            base_price: 'locations',
            default_duration: 'durations',
            min_duration: 'durations',
            max_duration: 'durations',
            min_workers: 'durations',
            max_workers: 'durations',
            min_children: 'durations',
            max_children: 'durations',
            child_age_groups: 'durations',
            shifts: 'shifts',
            rules: 'rules',
            workers: 'workers',
            teams: 'workers',
            is_team_based: 'durations',
        };

        if (formErrors[firstErrorKey]) {
            let errorObj = formErrors[firstErrorKey];
            if (Array.isArray(errorObj)) {
                const firstNested = errorObj.find(e => e);
                if (firstNested) {
                    const subKey = Object.keys(firstNested)[0];
                    errorObj = firstNested[subKey];
                }
            } else if (errorObj && typeof errorObj === 'object' && !errorObj.message) {
                const subKey = Object.keys(errorObj)[0];
                errorObj = errorObj[subKey];
            }

            // Switch to error tab
            let targetTab = fieldToTabMap[firstErrorKey];
            if (!targetTab && firstErrorKey?.startsWith('child_age_groups')) {
                targetTab = 'durations';
            }
            if (targetTab) {
                setActiveTab(targetTab);
            }

            if (errorObj?.message) {
                toast.error(`${isArabic ? 'خطأ في المدخلات:' : 'Validation Error:'} ${errorObj.message}`);
            } else {
                toast.error(isArabic ? 'يرجى التحقق من الحقول المطلوبة' : 'Please check required fields.');
            }
        }
    };

    const onSubmit = (data) => submitMutation.mutate(data);
    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;
    const displayImage = imagePreview || (isEditMode ? fullServiceData?.image : null);

    const tabs = [
        { id: 'basic', label: t('form.tab_basic') },
        { id: 'locations', label: t('form.tab_locations') },
        { id: 'durations', label: t('form.tab_durations') },
        { id: 'shifts', label: t('form.tab_shifts') },
        { id: 'rules', label: t('form.tab_rules') },
        { id: 'workers', label: isTeamBasedService ? (isArabic ? 'فرق العمل المسندة' : 'Assigned Work Teams') : t('form.tab_workers') },
    ];

    if (isEditMode && isServiceLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="flex items-center gap-3">
                    <svg className="animate-spin h-8 w-8 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                    <span className="text-lg font-bold text-gray-700">{isArabic ? 'جاري تحميل بيانات الخدمة...' : 'Loading Service Details...'}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 font-main w-full pb-12">
           {/* Top Bar Header */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white/90">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/services')}
                        className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        title={isArabic ? 'رجوع' : 'Back'}
                    >
                        <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800">
                            {isEditMode ? (isArabic ? `تعديل الخدمة: ${fullServiceData?.name_ar || ''}` : `Edit Service: ${fullServiceData?.name_en || ''}`) : (isArabic ? 'إضافة خدمة جديدة' : 'Create New Service')}
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {isArabic ? 'إدارة كامل بيانات وتفاصيل وقواعد وتعيينات العمالة للخدمة' : 'Manage full configuration, pricing rules, and assigned workers'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/services')}
                        className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold text-sm transition-colors"
                    >
                        {t('form.cancel')}
                    </button>
                    <button
                        type="submit"
                        form="service-form"
                        disabled={submitMutation.isPending}
                        className="px-6 py-2.5 rounded-xl bg-[#E91E63] hover:bg-[#c2185b] text-white font-bold text-sm transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                    >
                        {submitMutation.isPending ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                <span>{isArabic ? 'جاري الحفظ...' : 'Saving...'}</span>
                            </>
                        ) : (
                            <span>{isArabic ? 'حفظ البيانات' : 'Save Service'}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Horizontal Navigation Tabs */}
            <div className="flex border-b border-gray-100 overflow-x-auto whitespace-nowrap bg-white mb-6">
                {tabs.map((tab) => {
                    const active = activeTab === tab.id;
                    const hasErr = (tab.id === 'basic' && (errors.name_ar || errors.name_en || errors.description_ar || errors.description_en || errors.type)) ||
                                   (tab.id === 'locations' && (errors.base_price || errors.visit_types)) ||
                                   (tab.id === 'durations' && (errors.default_duration || errors.min_duration || errors.max_duration || errors.min_workers || errors.max_workers || errors.covered_persons_per_worker || errors.min_children || errors.max_children || errors.child_age_groups)) ||
                                   (tab.id === 'shifts' && (errors.working_days || errors.shifts)) ||
                                   (tab.id === 'rules' && (errors.rules || errors.terms_ar || errors.terms_en)) ||
                                   (tab.id === 'workers' && (errors.workers || errors.teams));
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-3 px-5 border-b-2 font-semibold text-sm transition-colors relative whitespace-nowrap ${
                                active 
                                    ? 'border-[#E91E63] text-[#E91E63]' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab.label}
                            {hasErr && <span className="absolute top-2.5 end-1.5 w-2 h-2 rounded-full bg-red-500" />}
                        </button>
                    );
                })}
            </div>

            <form id="service-form" onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-6">
                {/* TAB 1: BASIC INFORMATION */}
                {activeTab === 'basic' && (
                    <FormSection icon="info" title={t('form.tab_basic')} description={t('sections.basic.desc')}>
                        <div className="flex flex-col sm:flex-row gap-5 items-stretch">
                            <div className="sm:w-44 shrink-0">
                                <label className={LABEL_CLASS}>{t('form.image')}</label>
                                <label
                                    htmlFor="service-icon"
                                    className={`relative cursor-pointer flex items-center justify-center rounded-xl border-2 overflow-hidden h-40 transition-colors ${displayImage ? 'border-solid border-gray-200' : 'border-dashed border-gray-200 hover:border-[#E91E63] hover:bg-[#FDF0F3]/30'}`}
                                >
                                    {displayImage ? (
                                        <>
                                            <img src={displayImage} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
                                            <span className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[10px] py-1 text-center">{t('form.change_image')}</span>
                                        </>
                                    ) : (
                                        <span className="flex flex-col items-center gap-1.5 p-3 text-center">
                                            <svg className="w-6 h-6 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                            </svg>
                                            <span className="text-[10px] font-semibold text-[#E91E63]">{t('form.upload_image')}</span>
                                            <span className="text-[9px] text-gray-400">SVG Only</span>
                                        </span>
                                    )}
                                </label>
                                <input id="service-icon" type="file" accept="image/svg+xml" {...register('image')} className="hidden" />
                            </div>
                            
                            <div className="flex-1 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={LABEL_CLASS}>{t('form.name_ar')} *</label>
                                        <input key="name_ar" {...register('name_ar')} dir="rtl" className={`${INPUT_CLASS} ${errors.name_ar ? 'border-red-500' : ''}`} />
                                        <ErrorMsg name="name_ar" />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>{t('form.name_en')} *</label>
                                        <input key="name_en" {...register('name_en')} dir="ltr" className={`${INPUT_CLASS} ${errors.name_en ? 'border-red-500' : ''}`} />
                                        <ErrorMsg name="name_en" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={LABEL_CLASS}>{t('form.desc_ar')} *</label>
                                        <textarea key="desc_ar" {...register('description_ar')} dir="rtl" rows="3" className={`w-full px-4 py-2.5 text-sm border border-[#D94A78] rounded-[14px] outline-none focus:border-[#D94A78] transition-colors bg-[#F8F9FB] ${errors.description_ar ? 'border-red-500' : ''}`}></textarea>
                                        <ErrorMsg name="description_ar" />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>{t('form.desc_en')} *</label>
                                        <textarea key="desc_en" {...register('description_en')} dir="ltr" rows="3" className={`w-full px-4 py-2.5 text-sm border border-[#D94A78] rounded-[14px] outline-none focus:border-[#D94A78] transition-colors bg-[#F8F9FB] ${errors.description_en ? 'border-red-500' : ''}`}></textarea>
                                        <ErrorMsg name="description_en" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                            {!isEditMode && (
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.category')}</label>
                                    <SelectField registration={register('category_id')}>
                                        <option value="">-- {t('form.category')} --</option>
                                        {categories.map((cat) => <option key={cat.id} value={cat.id}>{isArabic ? cat.name_ar : cat.name_en}</option>)}
                                    </SelectField>
                                </div>
                            )}
                            <div className={isEditMode ? 'col-span-full' : ''}>
                                <label className={LABEL_CLASS}>{t('form.service_code')}</label>
                                <input type="text" {...register('service_code')} readOnly className={`${INPUT_CLASS} bg-gray-100 text-gray-500 cursor-not-allowed`} />
                                <ErrorMsg name="service_code" />
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>{t('form.type')}</label>
                                <SelectField registration={register('type')} disabled={isEditMode}>
                                    <option value="hourly">{t('types.hourly')}</option>
                                    <option value="other">{t('types.other')}</option>
                                </SelectField>
                            </div>
                            {isHospitality && (
                                <div className="col-span-full">
                                    <label className={LABEL_CLASS}>{isArabic ? 'خيارات جنس العمالة المتاحة' : 'Available Worker Gender Options'}</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                        {/* Male option card */}
                                        <label className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                                            (watch('worker_gender_options') || []).includes('Male')
                                                ? 'border-[#E91E63] bg-[#E91E63]/5 ring-1 ring-[#E91E63]'
                                                 : 'border-gray-200 hover:bg-gray-50'
                                        }`}>
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">👨</span>
                                                <div>
                                                    <div className="font-semibold text-gray-800 text-sm">{isArabic ? 'ذكور' : 'Male'}</div>
                                                    <div className="text-xs text-gray-500">{isArabic ? 'تفعيل العمال الذكور للمرفق' : 'Enable male workers'}</div>
                                                </div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                value="Male"
                                                {...register('worker_gender_options')}
                                                className="w-5 h-5 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63] focus:ring-offset-0 cursor-pointer accent-[#E91E63]"
                                            />
                                        </label>
                                        {/* Female option card */}
                                        <label className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                                            (watch('worker_gender_options') || []).includes('Female')
                                                ? 'border-[#E91E63] bg-[#E91E63]/5 ring-1 ring-[#E91E63]'
                                                 : 'border-gray-200 hover:bg-gray-50'
                                        }`}>
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">👩</span>
                                                <div>
                                                    <div className="font-semibold text-gray-800 text-sm">{isArabic ? 'إناث' : 'Female'}</div>
                                                    <div className="text-xs text-gray-500">{isArabic ? 'تفعيل العاملات الإناث للمرفق' : 'Enable female workers'}</div>
                                                </div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                value="Female"
                                                {...register('worker_gender_options')}
                                                className="w-5 h-5 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63] focus:ring-offset-0 cursor-pointer accent-[#E91E63]"
                                            />
                                        </label>
                                    </div>
                                    <ErrorMsg name="worker_gender_options" />
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <label className={LABEL_CLASS}>{t('status.active')}</label>
                            <OptionCards
                                value={statusValue}
                                onChange={(v) => setValue('status', v, { shouldValidate: true })}
                                options={[
                                    { value: 'active', label: t('status.active'), dot: 'bg-green-500' },
                                    { value: 'inactive', label: t('status.inactive'), dot: 'bg-gray-400' },
                                ]}
                            />
                        </div>

                        {/* Features list builder */}
                        <div className="space-y-3 pt-6 mt-6 border-t border-gray-100">
                            <div className="flex justify-between items-center">
                                <h5 className="text-sm font-bold text-gray-700">{t('form.section_features')}</h5>
                                <button type="button" onClick={() => appendFeature({ ar: '', en: '' })} className="text-xs font-semibold text-[#E91E63] hover:bg-[#FDF0F3] px-2.5 py-1 rounded transition-colors">+ {t('form.add_feature')}</button>
                            </div>
                            {featureFields.length === 0 && <p className="text-xs text-gray-400 italic">{t('form.no_features')}</p>}
                            <div className="space-y-2">
                                {featureFields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2 items-center bg-gray-50/50 p-2 border border-gray-100 rounded-lg">
                                        <input type="text" placeholder={t('form.feature_ar')} {...register(`features.${index}.ar`)} dir="rtl" className={`${INPUT_CLASS} !py-1.5 text-xs`} />
                                        <input type="text" placeholder={t('form.feature_en')} {...register(`features.${index}.en`)} dir="ltr" className={`${INPUT_CLASS} !py-1.5 text-xs`} />
                                        <button type="button" onClick={() => removeFeature(index)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" aria-label={t('form.remove')}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </FormSection>
                )}

                {/* TAB 2: GEOGRAPHIC LOCATIONS & PRICING */}
                {activeTab === 'locations' && (
                    <div className="space-y-6">
                        <FormSection
                            icon="location"
                            title={isArabic ? 'مناطق التغطية الجغرافية (Geo-Fenced Zones)' : 'Geo-Fenced Service Zones'}
                            description={isArabic ? 'اختر المناطق الجغرافية المحددة بالخرائط التي تنطبق عليها هذه الخدمة.' : 'Select polygon zones on the map where this service is active.'}
                        >
                            {serviceZonesList.length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-2">
                                    {isArabic ? 'لا توجد مناطق تغطية مضافة حالياً. يمكنك إنشاء مناطق جديدة من صفحة "مناطق التغطية".' : 'No service zones found. Create new zones from Service Zones page.'}
                                </p>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between pb-2 mb-1 border-b border-gray-100">
                                        <span className="text-xs font-semibold text-gray-500">
                                            {isArabic
                                                ? `${selectedZoneIds.length} من أصل ${serviceZonesList.length} مناطق محددة`
                                                : `${selectedZoneIds.length} of ${serviceZonesList.length} zones selected`}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectedZoneIds.length === serviceZonesList.length) {
                                                    setSelectedZoneIds([]);
                                                } else {
                                                    setSelectedZoneIds(serviceZonesList.map((z) => String(z.id)));
                                                }
                                            }}
                                            className="text-xs font-bold text-[#E91E63] hover:underline cursor-pointer"
                                        >
                                            {selectedZoneIds.length === serviceZonesList.length
                                                ? (isArabic ? 'إلغاء تحديد الكل' : 'Deselect All')
                                                : (isArabic ? 'تحديد الكل' : 'Select All')}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                                    {serviceZonesList.map((zone) => {
                                        const isSelected = selectedZoneIds.some((zid) => String(zid) === String(zone.id));
                                        return (
                                            <div
                                                key={zone.id}
                                                onClick={() => {
                                                    setSelectedZoneIds((prev) =>
                                                        isSelected ? prev.filter((zid) => String(zid) !== String(zone.id)) : [...prev, String(zone.id)]
                                                    );
                                                }}
                                                className={`cursor-pointer p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                                                    isSelected
                                                        ? 'border-[#E91E63] bg-[#FDF0F3]/40 text-gray-900 shadow-2xs'
                                                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {}}
                                                        className="w-4 h-4 text-[#E91E63] rounded border-gray-300 focus:ring-[#E91E63]"
                                                    />
                                                    <div>
                                                        <p className="text-xs font-extrabold text-gray-800">{zone.name}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${zone.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    {zone.status === 'active' ? (isArabic ? 'مفعلة' : 'Active') : (isArabic ? 'معطلة' : 'Inactive')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                            )}
                        </FormSection>

                        {/* Sub-Items / Options & Pricing Section (Excluded for Deep Cleaning) */}
                        {!isDeepCleaning && (isOtherService || optionFields.length > 0) && (
                            <FormSection
                                icon="sparkles"
                                title={isArabic ? `${watch('name_ar') || 'الخدمة'} - خيارات الخدمة والأسعار` : `${watch('name_en') || 'Service'} Options & Pricing`}
                                description={isArabic ? 'إضافة وتخصيص الخيارات والأسعار والكميات المتاحة لهذه الخدمة.' : 'Configure option titles, unit prices, minimum and maximum allowed quantities.'}
                            >
                                <div className="space-y-4">
                                    {optionFields.length === 0 ? (
                                        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                            <p className="text-xs text-gray-500 font-semibold">
                                                {isArabic ? 'لم يتم إضافة أي خيارات تسعير بعد.' : 'No options added yet.'}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => appendOption({ name_ar: '', name_en: '', unit_price: '', min_qty: 1, max_qty: 10, status: 'active' })}
                                                className="mt-3 text-xs font-bold text-[#E91E63] hover:bg-[#FDF0F3] px-3 py-1.5 rounded-xl border border-[#E91E63]/30 transition-colors"
                                            >
                                                + {isArabic ? 'إضافة خيار جديد' : 'Add Option'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-2xs">
                                            <table className="w-full text-start text-xs">
                                                <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                                                    <tr>
                                                        <th className="p-3 text-start">{isArabic ? 'اسم الخيار (عربي / انجليزي)' : 'Option Name (AR / EN)'}</th>
                                                        <th className="p-3 text-start w-36">{isArabic ? 'سعر الوحدة' : 'Unit Price'}</th>
                                                        <th className="p-3 text-center w-24">{isArabic ? 'أقل كمية' : 'Min Qty'}</th>
                                                        <th className="p-3 text-center w-24">{isArabic ? 'أقصى كمية' : 'Max Qty'}</th>
                                                        <th className="p-3 text-center w-28">{isArabic ? 'الحالة' : 'Status'}</th>
                                                        <th className="p-3 text-center w-16">{isArabic ? 'إجراء' : 'Action'}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {optionFields.map((field, index) => (
                                                        <tr key={field.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="p-3 space-y-1.5">
                                                                <input
                                                                    type="text"
                                                                    placeholder={isArabic ? 'اسم الخيار بالعربي (مثال: كتب شخص واحد)' : 'Option name AR'}
                                                                    {...register(`options.${index}.name_ar`)}
                                                                    dir="rtl"
                                                                    className={`${INPUT_CLASS} !py-1.5 text-xs font-semibold`}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder={isArabic ? 'اسم الخيار بالانجليزي (مثال: One-seat Sofa)' : 'Option name EN'}
                                                                    {...register(`options.${index}.name_en`)}
                                                                    dir="ltr"
                                                                    className={`${INPUT_CLASS} !py-1.5 text-xs`}
                                                                />
                                                            </td>
                                                            <td className="p-3 align-top">
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        placeholder="0.00"
                                                                        {...register(`options.${index}.unit_price`)}
                                                                        className={`${INPUT_CLASS} !py-1.5 !ps-7 text-xs font-bold text-gray-800`}
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="p-3 align-top">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    {...register(`options.${index}.min_qty`)}
                                                                    className={`${INPUT_CLASS} !py-1.5 text-xs text-center font-semibold`}
                                                                />
                                                            </td>
                                                            <td className="p-3 align-top">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    {...register(`options.${index}.max_qty`)}
                                                                    className={`${INPUT_CLASS} !py-1.5 text-xs text-center font-semibold`}
                                                                />
                                                            </td>
                                                            <td className="p-3 align-top text-center">
                                                                <select
                                                                    {...register(`options.${index}.status`)}
                                                                    className="text-xs font-bold rounded-lg border-gray-200 py-1.5 px-2 bg-gray-50 text-gray-700 focus:ring-[#E91E63]"
                                                                >
                                                                    <option value="active">{isArabic ? 'نشط' : 'Active'}</option>
                                                                    <option value="inactive">{isArabic ? 'غير نشط' : 'Inactive'}</option>
                                                                </select>
                                                            </td>
                                                            <td className="p-3 align-top text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeOption(index)}
                                                                    className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
                                                                    title={isArabic ? 'حذف' : 'Remove'}
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <div className="p-3 bg-gray-50/50 border-t border-gray-200 flex justify-start">
                                                <button
                                                    type="button"
                                                    onClick={() => appendOption({ name_ar: '', name_en: '', unit_price: '', min_qty: 1, max_qty: 10, status: 'active' })}
                                                    className="text-xs font-bold text-[#E91E63] hover:bg-[#FDF0F3] px-3 py-1.5 rounded-xl border border-[#E91E63]/30 transition-colors flex items-center gap-1.5"
                                                >
                                                    <span>+</span>
                                                    <span>{isArabic ? 'إضافة خيار' : 'Add Option'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </FormSection>
                        )}

                        <FormSection icon="sparkles" title={isArabic ? 'الأسعار والزيارات' : 'Prices & Visit Options'}>
                            {(isCoreService || !isOtherService || isDeepCleaning) && (
                                <div className="mb-4">
                                    <label className={LABEL_CLASS}>{t('form.base_price')}</label>
                                    <input type="number" step="0.01" min={isCoreService ? "0.01" : "0"} max="99999999.99" {...register('base_price')} className={`${INPUT_CLASS} ${errors.base_price ? 'border-red-500' : ''}`} />
                                    <ErrorMsg name="base_price" />
                                </div>
                            )}
                            <div className="mb-4">
                                <label className={LABEL_CLASS}>{t('form.pricing_type')}</label>
                                <SelectField registration={register('pricing_type')} disabled={isPedicureManicure || isOtherService}>
                                    <option value="per_service">{isArabic ? 'سعر بالخدمة / الزيارة (Per Service)' : 'Per Service / Visit'}</option>
                                    {(!isPedicureManicure && !isOtherService) && <option value="per_hour">{isArabic ? 'سعر بالساعة (Per Hour)' : 'Per Hour'}</option>}
                                </SelectField>
                                <ErrorMsg name="pricing_type" />
                            </div>

                            <div className="space-y-3 pt-3 border-t border-gray-100">
                                <div className="flex justify-between items-center">
                                    <label className={LABEL_CLASS}>{t('form.visit_types')}</label>
                                    <span className="text-[10px] text-gray-400 font-semibold">{isArabic ? 'يجب اختيار نوع واحد على الأقل' : 'Select at least one'}</span>
                                </div>
                                <div className={`grid grid-cols-1 ${(!isHospitality && !isBabysitting && !isPedicureManicure && !isOtherService) ? 'sm:grid-cols-2' : ''} gap-4`}>
                                    
                                    {/* Visit type 1: Single Visit Card */}
                                    <div 
                                        onClick={() => setValue('single_visit_checked', !watchSingleVisitChecked, { shouldValidate: true })}
                                        className={`relative cursor-pointer border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 ${
                                            watchSingleVisitChecked 
                                            ? 'border-[#E91E63] bg-[#E91E63]/5 shadow-sm' 
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl transition-colors ${watchSingleVisitChecked ? 'bg-[#E91E63]/10 text-[#E91E63]' : 'bg-gray-100 text-gray-500'}`}>
                                                    <svg className="w-6 h-6 text-inherit" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-bold text-gray-800">{t('form.single_visit')}</h5>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{isArabic ? 'حجز لمرة واحدة فقط' : 'One-time visit booking'}</p>
                                                </div>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={watchSingleVisitChecked} 
                                                onChange={(e) => setValue('single_visit_checked', e.target.checked, { shouldValidate: true })}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-4 h-4 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63] accent-[#E91E63]" 
                                            />
                                        </div>
                                        
                                        {watchSingleVisitChecked && (
                                            <div onClick={(e) => e.stopPropagation()} className="pt-3 border-t border-gray-100/80">
                                                <label className="block text-xs font-semibold text-gray-600 mb-1">{t('form.discount')}</label>
                                                <div className="relative">
                                                    <input 
                                                        type="number" 
                                                        {...register('single_visit_discount')} 
                                                        placeholder="0" 
                                                        className={`${INPUT_CLASS} !py-2 text-sm pe-8`} 
                                                    />
                                                    <span className="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400 text-sm font-medium">%</span>
                                                </div>
                                                <ErrorMsg name="single_visit_discount" />
                                            </div>
                                        )}
                                    </div>

                                    {!isHospitality && !isBabysitting && !isPedicureManicure && !isOtherService && (
                                        <div 
                                            onClick={() => setValue('three_days_checked', !watchThreeDaysChecked, { shouldValidate: true })}
                                            className={`relative cursor-pointer border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 ${
                                                watchThreeDaysChecked 
                                                ? 'border-[#E91E63] bg-[#E91E63]/5 shadow-sm' 
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2.5 rounded-xl transition-colors ${watchThreeDaysChecked ? 'bg-[#E91E63]/10 text-[#E91E63]' : 'bg-gray-100 text-gray-500'}`}>
                                                        <svg className="w-6 h-6 text-inherit" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 12h.008v.008H12V12zm0 2.25h.008v.008H12v-.008zm-2.25-2.25h.008v.008H9.75V12zm0 2.25h.008v.008H9.75v-.008zm4.5-2.25h.008v.008H14.25V12zm0 2.25h.008v.008H14.25v-.008z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-sm font-bold text-gray-800">{t('form.three_days_per_week')}</h5>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">{isArabic ? 'جدول حجز متكرر 3 أيام أسبوعياً' : 'Recurring 3 days/week schedule'}</p>
                                                    </div>
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    checked={watchThreeDaysChecked} 
                                                    onChange={(e) => setValue('three_days_checked', e.target.checked, { shouldValidate: true })}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-4 h-4 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63] accent-[#E91E63]" 
                                                />
                                            </div>
                                            
                                            {watchThreeDaysChecked && (
                                                <div onClick={(e) => e.stopPropagation()} className="pt-3 border-t border-gray-100/80">
                                                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t('form.discount')}</label>
                                                    <div className="relative">
                                                        <input 
                                                            type="number" 
                                                            {...register('three_days_discount')} 
                                                            placeholder="0" 
                                                            className={`${INPUT_CLASS} !py-2 text-sm pe-8`} 
                                                        />
                                                        <span className="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400 text-sm font-medium">%</span>
                                                    </div>
                                                    <ErrorMsg name="three_days_discount" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <ErrorMsg name="visit_types" />
                            </div>
                        </FormSection>
                    </div>
                )}

                {/* TAB 3: WORKING WINDOWS & SESSION DURATIONS */}
                {activeTab === 'durations' && (
                    <FormSection icon="clock" title={t('form.tab_durations')} description={isArabic ? 'أوقات العمل الأساسية ومحددات الجلسات للمرة الواحدة.' : 'Configure daily service windows and default booking durations.'}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_CLASS}>{t('form.start_time')}</label>
                                <input type="time" {...register('start_time')} className={INPUT_CLASS} />
                                <ErrorMsg name="start_time" />
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>{t('form.end_time')}</label>
                                <input type="time" {...register('end_time')} className={INPUT_CLASS} />
                                <ErrorMsg name="end_time" />
                            </div>
                        </div>

                        <div>
                            <label className={LABEL_CLASS}>{t('form.default_duration')} ({t('form.hours')})</label>
                            <input type="number" {...register('default_duration')} className={`${INPUT_CLASS} ${errors.default_duration ? 'border-red-500' : ''}`} />
                            <ErrorMsg name="default_duration" />
                        </div>

                        {!isPedicureManicure && !isOtherService && (
                            <div className="space-y-4 pt-3 border-t border-gray-100">
                                <label className={`flex items-center gap-2 cursor-pointer ${(isHospitality || isBabysitting) ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                    <input 
                                        type="checkbox" 
                                        {...register('has_duration_range')} 
                                        disabled={isHospitality || isBabysitting}
                                        className="w-4 h-4 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63] disabled:opacity-50 disabled:cursor-not-allowed" 
                                    />
                                    <span className="text-sm font-semibold text-gray-700">{t('form.has_duration_range')}</span>
                                </label>
                                
                                {watchHasDurationRange && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-gray-100 rounded-lg bg-gray-50/50">
                                        <div>
                                            <label className={LABEL_CLASS}>{t('form.min_duration')}</label>
                                            <input type="number" {...register('min_duration')} className={INPUT_CLASS} />
                                            <ErrorMsg name="min_duration" />
                                        </div>
                                        <div>
                                            <label className={LABEL_CLASS}>{t('form.max_duration')}</label>
                                            <input type="number" {...register('max_duration')} className={INPUT_CLASS} />
                                            <ErrorMsg name="max_duration" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Assignment Model Selector (Teams vs Workers) for Specialized Services (6 to 11) */}
                        {isSpecializedService && (
                            <div className="p-5 border border-pink-100 rounded-2xl bg-[#FDF0F3]/40 space-y-3 pt-3 border-t border-gray-100">
                                <label className="block text-sm font-bold text-gray-800">
                                    {isArabic ? 'طريقة تعيين مقدمي الخدمة (فرق عمل أم عمالة)' : 'Service Resource Model (Teams vs. Workers)'}
                                </label>
                                <p className="text-xs text-gray-500">
                                    {isArabic 
                                        ? 'حدد ما إذا كانت الخدمة تعتمد على فرق عمل متكاملة أو عمالة فردية محددة.' 
                                        : 'Choose whether this service is executed by teams or individual workers.'}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setValue('is_team_based', true, { shouldValidate: true });
                                        }}
                                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-start transition-all cursor-pointer ${
                                            watchIsTeamBased
                                                ? 'border-[#E91E63] bg-white shadow-sm ring-2 ring-[#E91E63]/10'
                                                : 'border-gray-200 bg-white/60 hover:bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            watchIsTeamBased ? 'border-[#E91E63]' : 'border-gray-300'
                                        }`}>
                                            {watchIsTeamBased && <div className="w-2.5 h-2.5 rounded-full bg-[#E91E63]" />}
                                        </div>
                                        <div>
                                            <span className="block text-sm font-bold text-gray-800">
                                                {isArabic ? 'فرق عمل (Teams)' : 'Work Teams'}
                                            </span>
                                            <span className="block text-xs text-gray-400 mt-0.5">
                                                {isArabic ? 'إسناد فرق عمل متكاملة لهذه الخدمة' : 'Assign full teams to this service'}
                                            </span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setValue('is_team_based', false, { shouldValidate: true });
                                            const currentMin = watch('min_workers');
                                            const val = (currentMin && Number(currentMin) > 0) ? Number(currentMin) : 1;
                                            setValue('min_workers', val, { shouldValidate: true });
                                            setValue('max_workers', val, { shouldValidate: true });
                                        }}
                                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-start transition-all cursor-pointer ${
                                            !watchIsTeamBased
                                                ? 'border-[#E91E63] bg-white shadow-sm ring-2 ring-[#E91E63]/10'
                                                : 'border-gray-200 bg-white/60 hover:bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            !watchIsTeamBased ? 'border-[#E91E63]' : 'border-gray-300'
                                        }`}>
                                            {!watchIsTeamBased && <div className="w-2.5 h-2.5 rounded-full bg-[#E91E63]" />}
                                        </div>
                                        <div>
                                            <span className="block text-sm font-bold text-gray-800">
                                                {isArabic ? 'عمال أفراد (Workers)' : 'Individual Workers'}
                                            </span>
                                            <span className="block text-xs text-gray-400 mt-0.5">
                                                {isArabic ? 'إسناد عمال محددين مع تحديد عدد العمال' : 'Assign specific workers with count'}
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Workers count (min/max): only shown when NOT team-based */}
                        {!watchIsTeamBased && (
                            <div className="space-y-2 pt-3 border-t border-gray-100">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={LABEL_CLASS}>{t('form.min_workers')}</label>
                                        <input 
                                            type="number" 
                                            {...register('min_workers', {
                                                onChange: (e) => {
                                                    const val = Number(e.target.value);
                                                    if (val > 0) {
                                                        setValue('max_workers', val, { shouldValidate: true });
                                                    }
                                                }
                                            })} 
                                            className={INPUT_CLASS} 
                                        />
                                        <ErrorMsg name="min_workers" />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>{t('form.max_workers')}</label>
                                        <input 
                                            type="number" 
                                            {...register('max_workers', {
                                                onChange: (e) => {
                                                    const val = Number(e.target.value);
                                                    if (val > 0) {
                                                        setValue('min_workers', val, { shouldValidate: true });
                                                    }
                                                }
                                            })} 
                                            className={INPUT_CLASS} 
                                        />
                                        <ErrorMsg name="max_workers" />
                                    </div>
                                </div>
                                <p className="text-xs text-[#E91E63] font-bold mt-1">
                                    {isArabic 
                                        ? '💡 يجب أن يكون الحد الأدنى والحد الأقصى لعدد العمال متطابقين دائماً ويساوي عدد العمال المسندين للخدمة.' 
                                        : '💡 Minimum and Maximum workers must always be equal and match the assigned workers count.'}
                                </p>
                            </div>
                        )}

                        {/* Person-Based Worker Calculation Rule (Pedicure & Manicure / Other Services Only) */}
                        {isPedicureManicure && (
                            <div className="mt-4 p-4 border border-rose-200 bg-rose-50/40 rounded-2xl space-y-4">
                                <div>
                                    <label className={LABEL_CLASS}>
                                        {isArabic ? 'عدد الأشخاص المغطاة لكل عامل (Covered Persons Per Worker)' : 'Covered Persons Per Worker'}
                                    </label>
                                    <input 
                                        type="number" 
                                        {...register('covered_persons_per_worker')} 
                                        placeholder="1" 
                                        className={`${INPUT_CLASS} bg-white max-w-xs`} 
                                    />
                                    <ErrorMsg name="covered_persons_per_worker" />
                                    <p className="text-xs text-gray-500 mt-1.5">
                                        {isArabic 
                                            ? `أقصى عدد ساعات عمل للعامل الواحد هو 8 ساعات يومياً. يتم احتساب الحد الأدنى للعمالة المطلوبة تلقائياً: (عدد الأشخاص × المدة الافتراضية ${Number(watch('default_duration')) || 2} س) ÷ 8 ساعات.`
                                            : `Each worker works a maximum of 8 hours per day. Required minimum workers is calculated automatically: (Number of Persons × Default Duration ${Number(watch('default_duration')) || 2}h) ÷ 8 hours.`}
                                    </p>
                                </div>

                                {/* Example Calculation Table from User Story */}
                                <div className="bg-white p-3.5 rounded-xl border border-rose-100 shadow-sm text-xs">
                                    <p className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {isArabic ? 'جدول أمثلة وقواعد احتساب العمالة الديناميكي (8 ساعات عمل يومياً لكل عامل):' : 'Dynamic Worker Calculation Rule Examples (8 Work Hours/Day Per Worker):'}
                                    </p>
                                    
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-start border-collapse text-[11px]">
                                            <thead>
                                                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                                    <th className="p-2 text-start">{isArabic ? 'عدد الأشخاص المطلوبة' : 'Number of Persons'}</th>
                                                    <th className="p-2 text-start">{isArabic ? 'إجمالي ساعات العمل (الأشخاص × المدة)' : 'Total Work Hours (Persons × Duration)'}</th>
                                                    <th className="p-2 text-start">{isArabic ? 'عدد العمالة المحسوب' : 'Required Workers'}</th>
                                                    <th className="p-2 text-start">{isArabic ? 'مدة الخدمة الافتراضية' : 'Default Duration'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 font-medium">
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((personCount) => {
                                                    const duration = Number(watch('default_duration')) || 2;
                                                    const totalHours = personCount * duration;
                                                    const requiredWorkers = Math.ceil(totalHours / 8);
                                                    return (
                                                        <tr key={personCount}>
                                                            <td className="p-2 font-bold text-gray-700">{personCount}</td>
                                                            <td className="p-2 text-gray-500">{totalHours} {isArabic ? 'ساعة إجمالية' : 'total hours'}</td>
                                                            <td className="p-2 font-bold text-[#E91E63]">{requiredWorkers} {isArabic ? (requiredWorkers === 1 ? 'عامل' : 'عمال') : (requiredWorkers === 1 ? 'worker' : 'workers')}</td>
                                                            <td className="p-2 text-gray-600">{duration} {isArabic ? 'ساعة' : 'hours'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isBabysitting && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                                <div>
                                    <label className={LABEL_CLASS}>{isArabic ? 'الحد الأدنى لعدد الأطفال' : 'Minimum Children'}</label>
                                    <input type="number" {...register('min_children')} className={INPUT_CLASS} />
                                    <ErrorMsg name="min_children" />
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>{isArabic ? 'الحد الأقصى لعدد الأطفال' : 'Maximum Children'}</label>
                                    <input type="number" {...register('max_children')} className={INPUT_CLASS} />
                                    <ErrorMsg name="max_children" />
                                </div>
                            </div>
                        )}

                        {isBabysitting && (
                            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800">{isArabic ? 'قواعد احتساب جليسة الأطفال حسب الفئات العمرية' : 'Child Age Group Babysitter Calculation Rules'}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">{isArabic ? 'تحديد فئات الأعمار (بالأشهر) وعدد المربيات المطلوب.' : 'Configure required babysitter count rules per child age group (in months).'}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => appendChildAgeGroup({ name_ar: '', name_en: '', age_from: 0, age_to: 0, calculation_type: 'ratio_based', children_count: 1, required_worker_count: 1, status: 'active' })}
                                        className="px-3 py-1.5 text-xs font-bold text-white bg-[#E91E63] hover:bg-[#D81B60] rounded-lg transition-colors"
                                    >
                                        {isArabic ? '+ إضافة فئة عمرية' : '+ Add Age Group'}
                                    </button>
                                </div>

                                {errors.child_age_groups && !Array.isArray(errors.child_age_groups) && (
                                    <p className="text-xs text-red-500 mt-1">{errors.child_age_groups.message}</p>
                                )}

                                <div className="space-y-4">
                                    {childAgeGroupFields.map((field, idx) => {
                                        return (
                                            <div key={field.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50/30 space-y-4 relative">
                                                <button
                                                    type="button"
                                                    onClick={() => removeChildAgeGroup(idx)}
                                                    className="absolute top-4 end-4 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                                                >
                                                    {isArabic ? 'حذف' : 'Remove'}
                                                </button>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className={LABEL_CLASS}>{isArabic ? 'اسم الفئة (عربي)' : 'Group Name (Arabic)'}</label>
                                                        <input type="text" {...register('child_age_groups.' + idx + '.name_ar')} className={INPUT_CLASS} placeholder="مثال: من حديثي الولادة إلى سنتين" />
                                                        {errors.child_age_groups?.[idx]?.name_ar && <span className="text-xs text-red-500">{errors.child_age_groups[idx].name_ar.message}</span>}
                                                    </div>
                                                    <div>
                                                        <label className={LABEL_CLASS}>{isArabic ? 'اسم الفئة (إنجليزي)' : 'Group Name (English)'}</label>
                                                        <input type="text" {...register('child_age_groups.' + idx + '.name_en')} className={INPUT_CLASS} placeholder="e.g. Newborn to 2 Years" />
                                                        {errors.child_age_groups?.[idx]?.name_en && <span className="text-xs text-red-500">{errors.child_age_groups[idx].name_en.message}</span>}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className={LABEL_CLASS}>{isArabic ? 'العمر من (بالأشهر)' : 'Age From (Months)'}</label>
                                                        <input type="number" {...register('child_age_groups.' + idx + '.age_from')} className={INPUT_CLASS} min="0" />
                                                        {errors.child_age_groups?.[idx]?.age_from && <span className="text-xs text-red-500">{errors.child_age_groups[idx].age_from.message}</span>}
                                                    </div>
                                                    <div>
                                                        <label className={LABEL_CLASS}>{isArabic ? 'العمر إلى (بالأشهر)' : 'Age To (Months)'}</label>
                                                        <input type="number" {...register('child_age_groups.' + idx + '.age_to')} className={INPUT_CLASS} min="0" />
                                                        {errors.child_age_groups?.[idx]?.age_to && <span className="text-xs text-red-500">{errors.child_age_groups[idx].age_to.message}</span>}
                                                    </div>
                                                    <div>
                                                        <label className={LABEL_CLASS}>{isArabic ? 'الحالة' : 'Status'}</label>
                                                        <select {...register('child_age_groups.' + idx + '.status')} className={INPUT_CLASS}>
                                                            <option value="active">{isArabic ? 'نشط' : 'Active'}</option>
                                                            <option value="inactive">{isArabic ? 'غير نشط' : 'Inactive'}</option>
                                                        </select>
                                                        {errors.child_age_groups?.[idx]?.status && <span className="text-xs text-red-500">{errors.child_age_groups[idx].status.message}</span>}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                                                    {/* Calculation Rule is ratio_based */}
                                                    <input type="hidden" {...register('child_age_groups.' + idx + '.calculation_type')} value="ratio_based" />
                                                    <div>
                                                        <label className={LABEL_CLASS}>{isArabic ? 'عدد الأطفال المقابل' : 'Children Count'}</label>
                                                        <input type="number" {...register('child_age_groups.' + idx + '.children_count')} className={INPUT_CLASS} min="1" />
                                                        {errors.child_age_groups?.[idx]?.children_count && <span className="text-xs text-red-500">{errors.child_age_groups[idx].children_count.message}</span>}
                                                    </div>
                                                    <div>
                                                        <label className={LABEL_CLASS}>{isArabic ? 'عدد المربيات المطلوب' : 'Required Babysitters'}</label>
                                                        <input type="number" {...register('child_age_groups.' + idx + '.required_worker_count')} className={INPUT_CLASS} min="1" />
                                                        {errors.child_age_groups?.[idx]?.required_worker_count && <span className="text-xs text-red-500">{errors.child_age_groups[idx].required_worker_count.message}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </FormSection>
                )}

                {/* TAB 4: WORKING DAYS & SHIFTS */}
                {activeTab === 'shifts' && (
                    <div className={(isHospitality || isBabysitting || isPedicureManicure) ? "w-full space-y-6" : "grid grid-cols-1 md:grid-cols-2 gap-6"}>
                        
                        {/* Working Days Select */}
                        <FormSection icon="calendar" title={t('form.working_days')} description={isArabic ? 'اختر الأيام المتاحة لتقديم الخدمة.' : 'Select days of the week when this service is active.'}>
                            <div className={`grid ${(!isHospitality && !isBabysitting && !isPedicureManicure) ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-2.5`}>
                                {WEEK_DAYS.map((day) => (
                                    <label key={day} className="flex items-center gap-2 p-2.5 border border-gray-100 bg-gray-50/50 rounded-lg cursor-pointer hover:bg-white transition-colors">
                                        <input type="checkbox" value={day} {...register('working_days')} className="w-4 h-4 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63] accent-[#E91E63]" />
                                        <span className="text-xs font-semibold text-gray-700">{t(`days.${day}`)}</span>
                                    </label>
                                ))}
                            </div>
                        </FormSection>

                        {/* Shift Start/End Times List Builder */}
                        {!isHospitality && !isBabysitting && !isPedicureManicure && (
                            <FormSection
                                icon="clock"
                                title={t('form.shifts')}
                                description={isArabic ? 'أدخل وقت البدء والانتهاء لكل شفت عمل يومي.' : 'Add start and end times for daily shifts.'}
                                action={<button type="button" onClick={() => appendShift({ start_time: DEFAULT_START_TIME, end_time: '' })} className="text-xs font-semibold text-[#E91E63] hover:bg-[#FDF0F3] px-2.5 py-1 rounded transition-colors">+ {t('form.add_shift')}</button>}
                            >
                                {errors.shifts && !Array.isArray(errors.shifts) && <p className="text-red-500 text-xs mb-3 font-semibold">{errors.shifts.message}</p>}
                                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                                    {shiftFields.map((field, index) => {
                                        const startTimeVal = watch(`shifts.${index}.start_time`);
                                        const defaultDurationVal = watch('default_duration');
                                        
                                        const calculatedEnd = calculateEndTime(startTimeVal, defaultDurationVal);
                                        const rowError = errors.shifts?.[index]?.start_time;
                
                                        return (
                                            <div 
                                                key={field.id} 
                                                className={`flex flex-col gap-2 bg-gray-50/60 p-3.5 border rounded-xl relative transition-all duration-300 ${
                                                    rowError 
                                                    ? 'border-red-300 bg-red-50/10 hover:border-red-400' 
                                                    : 'border-gray-100 hover:border-[#E91E63]/25'
                                                }`}
                                            >
                                                <div className="flex gap-3 items-center w-full">
                                                    <span className="text-xs font-bold text-gray-400 shrink-0">#{index + 1}</span>
                                                    
                                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">
                                                                {isArabic ? 'وقت البدء' : 'Start Time'}
                                                            </label>
                                                            <input 
                                                                type="time" 
                                                                {...register(`shifts.${index}.start_time`)} 
                                                                className={`${INPUT_CLASS} !py-1.5 text-xs`} 
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">
                                                                {isArabic ? 'وقت الانتهاء' : 'End Time'}
                                                            </label>
                                                            <input 
                                                                type="time" 
                                                                value={calculatedEnd} 
                                                                disabled 
                                                                className={`${INPUT_CLASS} !py-1.5 text-xs bg-gray-100 text-gray-400 cursor-not-allowed`} 
                                                            />
                                                        </div>
                                                    </div>
                
                                                    {shiftFields.length > 1 && (
                                                        <button type="button" onClick={() => removeShift(index)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors mt-4 self-center" aria-label={t('form.remove')}>
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    )}
                                                </div>
                                                {rowError && (
                                                    <p className="text-red-500 text-[11px] font-semibold mt-1 ps-7 animate-pulse">
                                                        {rowError.message}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </FormSection>
                        )}
                    </div>
                )}

                {/* TAB 5: RULES, POLICIES & TERMS */}
                {activeTab === 'rules' && (
                    <div className="space-y-6">
                        
                        {/* Cancellation & Rescheduling Rules */}
                        <FormSection icon="shield" title={t('form.section_rules')} description={isArabic ? 'سياسات وقواعد إلغاء وتعديل الحجوزات.' : 'Cancellation, rescheduling and booking lead time configurations.'}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                
                                {/* Cancel Policy */}
                                <div className="p-4 border border-gray-100 bg-gray-50/50 rounded-lg space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" {...register('rules.allow_cancel')} className="w-4 h-4 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63] accent-[#E91E63]" />
                                        <span className="text-sm font-semibold text-gray-700">{t('form.allow_cancel')}</span>
                                    </label>
                                    {watchAllowCancel && (
                                        <div>
                                            <label className={LABEL_CLASS}>{t('form.free_cancel')}</label>
                                            <input type="number" {...register('rules.free_cancel_cutoff_hours')} className={`${INPUT_CLASS} !py-2 text-sm`} />
                                            {errors.rules?.free_cancel_cutoff_hours && <p className="text-red-500 text-xs mt-1">{errors.rules.free_cancel_cutoff_hours.message}</p>}
                                        </div>
                                    )}
                                </div>

                                {/* Reschedule Policy */}
                                <div className="p-4 border border-gray-100 bg-gray-50/50 rounded-lg space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" {...register('rules.allow_reschedule')} className="w-4 h-4 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63] accent-[#E91E63]" />
                                        <span className="text-sm font-semibold text-gray-700">{t('form.allow_reschedule')}</span>
                                    </label>
                                    {watchAllowReschedule && (
                                        <div>
                                            <label className={LABEL_CLASS}>{t('form.reschedule_cutoff')}</label>
                                            <input type="number" {...register('rules.reschedule_cutoff_hours')} className={`${INPUT_CLASS} !py-2 text-sm`} />
                                            {errors.rules?.reschedule_cutoff_hours && <p className="text-red-500 text-xs mt-1">{errors.rules.reschedule_cutoff_hours.message}</p>}
                                        </div>
                                    )}
                                </div>

                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                                <div className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 flex items-center h-full">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" {...register('rules.allow_same_day')} className="w-4 h-4 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63] accent-[#E91E63]" />
                                        <span className="text-sm font-semibold text-gray-700">{t('form.allow_same_day')}</span>
                                    </label>
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.max_advance_booking_days')}</label>
                                    <input type="number" {...register('rules.max_advance_booking_days')} className={INPUT_CLASS} />
                                    {errors.rules?.max_advance_booking_days && <p className="text-red-500 text-xs mt-1">{errors.rules.max_advance_booking_days.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.arrival_buffer')}</label>
                                    <input type="number" {...register('rules.arrival_buffer_minutes')} className={INPUT_CLASS} />
                                    {errors.rules?.arrival_buffer_minutes && <p className="text-red-500 text-xs mt-1">{errors.rules.arrival_buffer_minutes.message}</p>}
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.grace_period')}</label>
                                    <input type="number" {...register('rules.late_arrival_grace_minutes')} className={INPUT_CLASS} />
                                    {errors.rules?.late_arrival_grace_minutes && <p className="text-red-500 text-xs mt-1">{errors.rules.late_arrival_grace_minutes.message}</p>}
                                </div>
                            </div>
                        </FormSection>

                        {/* Terms and Conditions */}
                        <FormSection icon="document" title={isArabic ? 'الشروط والأحكام الخاصة بالخدمة' : 'Terms & Conditions'}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.terms_ar')}</label>
                                    <textarea {...register('terms_ar')} dir="rtl" rows="4" className={`w-full px-4 py-2.5 text-sm border border-[#D94A78] rounded-[14px] outline-none focus:border-[#D94A78] transition-colors bg-[#F8F9FB]`}></textarea>
                                    <ErrorMsg name="terms_ar" />
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.terms_en')}</label>
                                    <textarea {...register('terms_en')} dir="ltr" rows="4" className={`w-full px-4 py-2.5 text-sm border border-[#D94A78] rounded-[14px] outline-none focus:border-[#D94A78] transition-colors bg-[#F8F9FB]`}></textarea>
                                    <ErrorMsg name="terms_en" />
                                </div>
                            </div>
                        </FormSection>
                    </div>
                )}

                {/* TAB 6: WORKERS ASSIGNMENT (Services 1-5) OR TEAMS ASSIGNMENT (Services 6-11) */}
                {activeTab === 'workers' && (
                    isTeamBasedService ? (
                        <FormSection
                            icon="users"
                            title={isArabic ? 'فرق العمل المسندة للخدمة التخصصية' : 'Assigned Work Teams'}
                            description={isArabic ? 'اختر فرق العمل التي تقدم هذه الخدمة (سيتم ربط عمال الفرق بالخدمة تلقائياً).' : 'Select the work teams that provide this specialized service.'}
                            action={(watch('teams') || []).length > 0
                                ? <span className="text-xs font-semibold text-[#E91E63] bg-[#FDF0F3] px-2.5 py-1 rounded-lg">{isArabic ? `${(watch('teams') || []).length} فرق محددة` : `${(watch('teams') || []).length} teams selected`}</span>
                                : null}
                        >
                            {/* Teams Action Bar */}
                            <div className="flex items-center justify-between mb-3 px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs shadow-2xs">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const allTeamIds = teamsList.map(t => String(t.id));
                                            setValue('teams', allTeamIds, { shouldValidate: true, shouldDirty: true });
                                        }}
                                        className="font-bold text-[#E91E63] hover:underline cursor-pointer"
                                    >
                                        {isArabic ? 'تحديد كافة الفرق' : 'Select All Teams'}
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setValue('teams', [], { shouldValidate: true, shouldDirty: true });
                                        }}
                                        className="font-bold text-gray-500 hover:text-gray-700 hover:underline cursor-pointer"
                                    >
                                        {isArabic ? 'إلغاء التحديد' : 'Unselect All'}
                                    </button>
                                </div>
                                <span className="font-semibold text-gray-500">
                                    {isArabic ? `تم تحديد ${(watch('teams') || []).length} من ${teamsList.length} فرق` : `Selected ${(watch('teams') || []).length} of ${teamsList.length} teams`}
                                </span>
                            </div>

                            <div className="flex flex-col gap-3 border border-gray-100 rounded-xl p-4 max-h-96 overflow-y-auto bg-gray-50/50">
                                {isTeamsLoading ? (
                                    <div className="flex justify-center items-center py-6 text-sm text-gray-500">{t('loading')}</div>
                                ) : teamsList.length === 0 ? (
                                    <div className="flex justify-center items-center py-6 text-sm text-gray-500">{isArabic ? 'لا توجد فرق عمل نشطة حالياً.' : 'No active work teams found.'}</div>
                                ) : (
                                    teamsList.map((team) => {
                                        const isChecked = (watch('teams') || []).includes(String(team.id));
                                        return (
                                            <label
                                                key={team.id}
                                                className={`flex items-start gap-3.5 p-3.5 border rounded-xl cursor-pointer transition-all ${
                                                    isChecked
                                                        ? 'bg-pink-50/50 border-[#E91E63] shadow-xs'
                                                        : 'bg-white border-gray-100 hover:border-gray-200'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    value={String(team.id)}
                                                    {...register('teams')}
                                                    className="w-4 h-4 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63] accent-[#E91E63] mt-1"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-gray-800">
                                                            {isArabic ? team.name_ar : team.name_en || team.name_ar}
                                                        </p>
                                                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                                            {team.code}
                                                        </span>
                                                        <span className="text-xs font-bold text-[#E91E63] bg-pink-50 px-2 py-0.5 rounded-full">
                                                            {team.workers_count || team.workers?.length || 0} {isArabic ? 'عمال' : 'workers'}
                                                        </span>
                                                    </div>
                                                    {team.workers && team.workers.length > 0 && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            <span className="font-semibold text-gray-700">{isArabic ? 'أعضاء الفريق: ' : 'Members: '}</span>
                                                            {team.workers.map((w) => w.name).join('، ')}
                                                        </p>
                                                    )}
                                                    {team.notes && (
                                                        <p className="text-[11px] text-gray-400 mt-0.5 italic">
                                                            {team.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                            <ErrorMsg name="teams" />
                        </FormSection>
                    ) : (
                        <FormSection
                            icon="users"
                            title={t('form.tab_workers')}
                            description={isArabic ? 'حدد العمال النشطين المؤهلين لتقديم هذه الخدمة.' : 'Select active workers who are qualified to perform this service.'}
                            action={(watch('workers') || []).length > 0
                                ? <span className="text-xs font-semibold text-[#E91E63] bg-[#FDF0F3] px-2.5 py-1 rounded-lg">{t('form.workers_selected', { num: (watch('workers') || []).length })}</span>
                                : null}
                        >
                            {/* Prominent error alert if worker assignment conflict exists */}
                            {errors.workers && (
                                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
                                    <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div className="flex-1 font-semibold leading-relaxed">{errors.workers.message}</div>
                                </div>
                            )}

                            {/* Service Gender Restriction / Filter Bar (No icons, text titles only) */}
                            {serviceAllowedGenders.length === 1 ? (
                                <div className="mb-3 flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                                    <span className="text-xs font-medium text-gray-600">
                                        {serviceAllowedGenders[0] === 'Female'
                                            ? (isArabic ? 'الخدمة مخصصة للعاملات الإناث فقط' : 'Service accepts female workers only')
                                            : (isArabic ? 'الخدمة مخصصة للعمال الذكور فقط' : 'Service accepts male workers only')}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                        serviceAllowedGenders[0] === 'Female'
                                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                                    }`}>
                                        {serviceAllowedGenders[0] === 'Female' ? (isArabic ? 'إناث' : 'Female') : (isArabic ? 'ذكور' : 'Male')}
                                    </span>
                                </div>
                            ) : serviceAllowedGenders.length > 1 ? (
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-gray-600 me-1">
                                        {isArabic ? 'تصفية حسب الجنس:' : 'Filter by gender:'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setWorkerGenderFilter('all')}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                                            workerGenderFilter === 'all'
                                                ? 'bg-[#E91E63] text-white border-[#E91E63] shadow-xs'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {isArabic ? 'الكل' : 'All'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setWorkerGenderFilter('Male')}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                                            workerGenderFilter === 'Male'
                                                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-sky-50'
                                        }`}
                                    >
                                        {isArabic ? 'ذكور' : 'Male'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setWorkerGenderFilter('Female')}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                                            workerGenderFilter === 'Female'
                                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-rose-50'
                                        }`}
                                    >
                                        {isArabic ? 'إناث' : 'Female'}
                                    </button>
                                </div>
                            ) : null}

                            {/* Worker Search & Filters */}
                            <div className="space-y-2.5 mb-3">
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                    <div className="relative flex-1">
                                        <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400 pointer-events-none">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </span>
                                        <input
                                            type="text"
                                            value={workerSearchInput}
                                            onChange={(e) => setWorkerSearchInput(e.target.value)}
                                            placeholder={t('form.search_workers')}
                                            className={`${INPUT_CLASS} ps-9 pe-8`}
                                        />
                                        {workerSearchInput && (
                                            <button
                                                type="button"
                                                onClick={() => setWorkerSearchInput('')}
                                                className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400 hover:text-gray-600"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>

                                    {/* Tab Filters */}
                                    <div className="flex items-center gap-1 p-1 bg-gray-100/90 rounded-xl border border-gray-200/60 self-start sm:self-auto shrink-0 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => setWorkerFilterTab('all')}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                workerFilterTab === 'all'
                                                    ? 'bg-white text-gray-900 shadow-2xs'
                                                    : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                        >
                                            {isArabic ? `الكل (${workerCounts.all})` : `All (${workerCounts.all})`}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setWorkerFilterTab('assigned')}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                workerFilterTab === 'assigned'
                                                    ? 'bg-white text-[#E91E63] shadow-2xs'
                                                    : 'text-gray-500 hover:text-[#E91E63]'
                                            }`}
                                        >
                                            {isArabic ? `المسندين لهذه الخدمة (${selectedWorkerIds.length})` : `Assigned (${selectedWorkerIds.length})`}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setWorkerFilterTab('unassigned')}
                                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                workerFilterTab === 'unassigned'
                                                    ? 'bg-white text-gray-900 shadow-2xs'
                                                    : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                        >
                                            {isArabic ? `غير مسندين / متاحين (${workerCounts.unassigned})` : `Available (${workerCounts.unassigned})`}
                                        </button>
                                    </div>
                                </div>

                                {/* Select All / Deselect All Action Bar */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs shadow-2xs">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 hover:text-[#E91E63] select-none">
                                            <input
                                                type="checkbox"
                                                checked={areAllVisibleSelected}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        handleSelectAllVisible();
                                                    } else {
                                                        handleDeselectAllVisible();
                                                    }
                                                }}
                                                className="w-4 h-4 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63] accent-[#E91E63] cursor-pointer"
                                            />
                                            <span>{isArabic ? 'تحديد الكل في هذه القائمة' : 'Select All in this list'}</span>
                                        </label>

                                        <span className="text-gray-300">|</span>

                                        <button
                                            type="button"
                                            onClick={handleSelectAllVisible}
                                            className="font-bold text-[#E91E63] hover:underline cursor-pointer"
                                        >
                                            {isArabic ? 'تحديد الكل' : 'Select All'}
                                        </button>

                                        <span className="text-gray-300">|</span>

                                        <button
                                            type="button"
                                            onClick={handleDeselectAllVisible}
                                            className="font-bold text-gray-500 hover:text-gray-700 hover:underline cursor-pointer"
                                        >
                                            {isArabic ? 'إلغاء التحديد' : 'Unselect All'}
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2 font-semibold text-xs text-end flex-wrap">
                                        <span className="px-2.5 py-1 rounded-lg font-bold text-xs bg-pink-50 text-[#E91E63] border border-pink-200">
                                            {isArabic
                                                ? `تم تحديد ${selectedWorkerIds.length} من إجمالي ${eligibleWorkers.length} عامل مؤهل ومتاح`
                                                : `Selected ${selectedWorkerIds.length} of ${eligibleWorkers.length} available workers`}
                                        </span>
                                        {workersList.length !== eligibleWorkers.length && (
                                            <span className="text-gray-400 font-normal">
                                                ({isArabic ? `المعروض: ${workersList.length}` : `Showing: ${workersList.length}`})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 border border-gray-100 rounded-xl p-4 max-h-80 overflow-y-auto bg-gray-50/50">
                                {isWorkersLoading ? (
                                    <div className="flex justify-center items-center py-6 text-sm text-gray-500 gap-2">
                                        <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                        <span>{t('loading')}</span>
                                    </div>
                                ) : workersList.length === 0 ? (
                                    <div className="flex flex-col justify-center items-center py-8 text-sm text-gray-400 gap-1">
                                        <p>{t('no_data')}</p>
                                        {workerSearchInput && (
                                            <button
                                                type="button"
                                                onClick={() => setWorkerSearchInput('')}
                                                className="text-xs font-bold text-[#E91E63] hover:underline"
                                            >
                                                {isArabic ? 'مسح البحث' : 'Clear search'}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    workersList.map((worker) => {
                                        const isFemale = String(worker.gender).toLowerCase() === 'female';
                                        const isChecked = selectedWorkerIds.includes(String(worker.id));
                                        const workerServices = (worker.assigned_services?.length
                                            ? worker.assigned_services
                                            : (worker.services?.length
                                                ? worker.services
                                                : (worker.assigned_service ? [worker.assigned_service] : [])));

                                        return (
                                            <label
                                                key={worker.id}
                                                className={`flex items-center justify-between gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                                                    isChecked
                                                        ? 'bg-pink-50/40 border-[#E91E63]/50 shadow-2xs'
                                                        : 'bg-white border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <input
                                                        type="checkbox"
                                                        value={String(worker.id)}
                                                        {...register('workers')}
                                                        className="w-4 h-4 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63] accent-[#E91E63] shrink-0"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-bold text-gray-900 truncate">{worker.name}</p>

                                                            {/* Service Badges */}
                                                            {workerServices.length > 0 ? (
                                                                workerServices.map((s) => {
                                                                    const isCurrent = id && Number(s.id) === Number(id);
                                                                    return (
                                                                        <span
                                                                            key={s.id}
                                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                                                                isCurrent
                                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                                                            }`}
                                                                        >
                                                                            <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                            </svg>
                                                                            <span>{isArabic ? (s.name_ar || s.name_en) : (s.name_en || s.name_ar)}</span>
                                                                            {isCurrent && <span className="text-[9px] font-normal text-emerald-600">({isArabic ? 'هذه الخدمة' : 'Current'})</span>}
                                                                        </span>
                                                                    );
                                                                })
                                                            ) : (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                                                    {isArabic ? 'غير مسند لخدمة' : 'Unassigned'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-0.5">{worker.nationality || '—'} · ★ {worker.rating || '0.00'}</p>
                                                    </div>
                                                </div>
                                                <div className="shrink-0">
                                                    {isFemale ? (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                            {isArabic ? 'أنثى' : 'Female'}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                                            {isArabic ? 'ذكر' : 'Male'}
                                                        </span>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                            <ErrorMsg name="workers" />
                        </FormSection>
                    )
                )}
            </form>
        </div>
    );
}
