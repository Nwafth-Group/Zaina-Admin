import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useMutation, useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FormSection } from '../../components/form/FormKit';

const EMPTY_PRICE = { city_id: '', area_id: '', price_per_service_period: '', currency: 'EGP', effective_start: '', effective_end: '' };

// Weekly availability. The form always renders all seven days; the `is_active`
// flag decides whether the service is bookable on that day, and each day can
// hold one or more time shifts (e.g. morning + evening).
const WEEK_DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DEFAULT_START = '09:00';
const DEFAULT_END = '17:00';
const EMPTY_SHIFT = { start_time: DEFAULT_START, end_time: DEFAULT_END };

// Group flat saved schedule rows by day onto the fixed seven-day template. Each
// day keeps a list of shifts; days without saved rows fall back to a single
// default shift and `fallbackActive` (active for a brand-new service).
const buildSchedules = (saved = [], { fallbackActive = false } = {}) => {
    const byDay = {};
    (saved || []).forEach((row) => {
        (byDay[row.day] ||= []).push(row);
    });
    return WEEK_DAYS.map((day) => {
        const rows = byDay[day] || [];
        return {
            day,
            is_active: rows.length ? rows.some((r) => !!r.is_active) : fallbackActive,
            shifts: rows.length
                ? rows.map((r) => ({ start_time: String(r.start_time).slice(0, 5), end_time: String(r.end_time).slice(0, 5) }))
                : [{ ...EMPTY_SHIFT }],
        };
    });
};

// Shared field styling — keeps the single-column form visually consistent.
const INPUT_CLASS = 'w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#E91E63] transition-colors bg-white';
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1.5';

/**
 * Styled <select>: the native browser arrow is removed and replaced with a
 * custom chevron placed on the trailing edge (logical `end-*`), so it lands on
 * the correct side in both RTL (Arabic) and LTR. Forwards a react-hook-form
 * registration object onto the select.
 */
function SelectField({ registration, children, className = '', disabled = false }) {
    return (
        <div className="relative">
            <select
                {...registration}
                disabled={disabled}
                className={`${INPUT_CLASS} appearance-none pe-10 ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
            >
                {children}
            </select>
            <svg className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
    );
}

/**
 * Status selector — radio cards that show every option at once (no dropdown).
 * Each card has a radio dot plus a status colour, so the look is distinct from
 * plain toggle buttons.
 */
function StatusRadioGroup({ value, onChange, options }) {
    return (
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(opt.value)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${active ? 'border-[#E91E63] bg-[#FDF0F3]' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-[#E91E63]' : 'border-gray-300'}`}>
                            {active && <span className="h-2 w-2 rounded-full bg-[#E91E63]" />}
                        </span>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${opt.dot}`} />
                        <span className={active ? 'text-[#E91E63]' : 'text-gray-600'}>{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

/**
 * One location-based price row. Owns its own area query, scoped to the row's
 * selected city, so each price can target a different city/area. Fields are
 * stacked in a single column to match the rest of the form.
 */
function ServicePriceRow({ index, register, control, setValue, errors, citiesList, isArabic, t, onRemove, canRemove }) {
    const cityId = useWatch({ control, name: `prices.${index}.city_id` });
    const { data: areas = [] } = useQuery({
        queryKey: ['areas', cityId],
        queryFn: async () => (await axiosInstance.get(`/admin/areas?city_id=${cityId}`)).data.data.items || [],
        enabled: !!cityId,
    });

    const rowErrors = errors?.prices?.[index] || {};
    const cityField = register(`prices.${index}.city_id`);

    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500">{t('form.price_per_period')} #{index + 1}</span>
                {canRemove && (
                    <button type="button" onClick={onRemove} className="text-xs font-medium text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                        {t('form.remove')}
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className={LABEL_CLASS}>{t('form.city')}</label>
                    <SelectField registration={{ ...cityField, onChange: (e) => { cityField.onChange(e); setValue(`prices.${index}.area_id`, ''); } }}>
                        <option value="">{t('form.select_city')}</option>
                        {citiesList.map((c) => <option key={c.id} value={c.id}>{isArabic ? c.name_ar : c.name_en}</option>)}
                    </SelectField>
                    {rowErrors.city_id && <p className="text-red-500 text-xs mt-1">{rowErrors.city_id.message}</p>}
                </div>
                <div>
                    <label className={LABEL_CLASS}>{t('form.area')}</label>
                    <SelectField registration={register(`prices.${index}.area_id`)} disabled={!cityId}>
                        <option value="">{t('form.select_area')}</option>
                        {areas.map((a) => <option key={a.id} value={a.id}>{isArabic ? a.name_ar : a.name_en}</option>)}
                    </SelectField>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className={LABEL_CLASS}>{t('form.price_per_period')}</label>
                    <input type="number" step="0.01" {...register(`prices.${index}.price_per_service_period`)} className={INPUT_CLASS} />
                    {rowErrors.price_per_service_period && <p className="text-red-500 text-xs mt-1">{rowErrors.price_per_service_period.message}</p>}
                </div>
                <div>
                    <label className={LABEL_CLASS}>{t('form.currency')}</label>
                    <input type="text" {...register(`prices.${index}.currency`)} className={INPUT_CLASS} />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className={LABEL_CLASS}>{t('form.effective_start')}</label>
                    <input type="date" {...register(`prices.${index}.effective_start`)} className={INPUT_CLASS} />
                </div>
                <div>
                    <label className={LABEL_CLASS}>{t('form.effective_end')}</label>
                    <input type="date" {...register(`prices.${index}.effective_end`)} className={INPUT_CLASS} />
                </div>
            </div>
        </div>
    );
}

/**
 * One weekday row of the weekly schedule: an active toggle plus a list of time
 * shifts (start/end) that can be added or removed independently.
 */
function ServiceDayShifts({ dayIndex, day, control, register, t }) {
    const { fields, append, remove } = useFieldArray({ control, name: `schedules.${dayIndex}.shifts` });
    const active = useWatch({ control, name: `schedules.${dayIndex}.is_active` });

    return (
        <div className="p-3 border border-gray-100 rounded-lg bg-gray-50/60">
            <input type="hidden" {...register(`schedules.${dayIndex}.day`)} />
            <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register(`schedules.${dayIndex}.is_active`)} className="w-4 h-4 text-[#E91E63] rounded focus:ring-[#E91E63]" />
                    <span className="text-sm font-medium text-gray-700">{t(`days.${day}`)}</span>
                </label>
                {active && (
                    <button
                        type="button"
                        onClick={() => append({ ...EMPTY_SHIFT })}
                        className="text-sm font-medium text-[#E91E63] hover:bg-[#FDF0F3] px-2.5 py-1 rounded-lg transition-colors"
                    >
                        + {t('form.add_shift')}
                    </button>
                )}
            </div>

            {active && (
                <div className="mt-2.5 space-y-2">
                    {fields.map((field, sIndex) => (
                        <div key={field.id} className="flex items-end gap-2">
                            <div>
                                <label className="block text-[11px] text-gray-400 mb-0.5">{t('form.schedule_from')}</label>
                                <input type="time" {...register(`schedules.${dayIndex}.shifts.${sIndex}.start_time`)} className={`${INPUT_CLASS} !w-auto py-2`} />
                            </div>
                            <div>
                                <label className="block text-[11px] text-gray-400 mb-0.5">{t('form.schedule_to')}</label>
                                <input type="time" {...register(`schedules.${dayIndex}.shifts.${sIndex}.end_time`)} className={`${INPUT_CLASS} !w-auto py-2`} />
                            </div>
                            {fields.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => remove(sIndex)}
                                    className="mb-1 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    aria-label={t('form.remove')}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ServiceActionModal({ serviceToEdit, categories, onClose }) {
    const { t, i18n } = useTranslation('services');
    const queryClient = useQueryClient();
    const isEditMode = !!serviceToEdit;
    const isArabic = i18n.language === 'ar';

    // Assigned-workers picker: searchable + paged so large worker lists stay light.
    const [workerSearchInput, setWorkerSearchInput] = useState('');
    const [workerSearch, setWorkerSearch] = useState('');
    useEffect(() => {
        const id = setTimeout(() => setWorkerSearch(workerSearchInput), 400);
        return () => clearTimeout(id);
    }, [workerSearchInput]);

    const {
        data: workersData,
        isLoading: isWorkersLoading,
        fetchNextPage: fetchMoreWorkers,
        hasNextPage: hasMoreWorkers,
        isFetchingNextPage: isFetchingMoreWorkers,
    } = useInfiniteQuery({
        queryKey: ['modal-workers', workerSearch],
        queryFn: async ({ pageParam = 1 }) => {
            const params = new URLSearchParams({ page: String(pageParam), per_page: '15' });
            if (workerSearch) params.append('search', workerSearch);
            return (await axiosInstance.get(`/admin/workers?${params.toString()}`)).data.data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const m = lastPage?.meta;
            return m && m.current_page < m.last_page ? m.current_page + 1 : undefined;
        },
    });
    const workersList = useMemo(() => (workersData?.pages || []).flatMap((p) => p?.items || []), [workersData]);

    // Auto-load more workers when the sentinel scrolls into the picker's own box.
    const workerScrollRef = useRef(null);
    const workerSentinelRef = useRef(null);
    useEffect(() => {
        const root = workerScrollRef.current;
        const target = workerSentinelRef.current;
        if (!root || !target || !hasMoreWorkers) return undefined;
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting && !isFetchingMoreWorkers) fetchMoreWorkers(); },
            { root, rootMargin: '120px' },
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [hasMoreWorkers, isFetchingMoreWorkers, fetchMoreWorkers, workersList.length]);

    const { data: citiesList = [] } = useQuery({
        queryKey: ['cities'],
        queryFn: async () => (await axiosInstance.get('/admin/cities')).data.data.items || [],
    });

    const schema = yup.object().shape({
        category_id: yup.string().required(t('validation.required')),
        type: yup.string().required(t('validation.required')),
        name_ar: yup.string().required(t('validation.required')),
        name_en: yup.string().required(t('validation.required')),
        status: yup.string().required(t('validation.required')),

        service_period_hours: yup.number().transform((value) => (isNaN(value) ? undefined : value)).when('type', {
            is: (val) => val === 'hourly' || val === 'both',
            then: (s) => s.required(t('validation.required')).min(1, t('validation.min_1')),
            otherwise: (s) => s.nullable(),
        }),
        min_contract_months: yup.number().transform((value) => (isNaN(value) ? undefined : value)).when('type', {
            is: (val) => val === 'moqema' || val === 'both',
            then: (s) => s.required(t('validation.required')).min(1, t('validation.min_1')),
            otherwise: (s) => s.nullable(),
        }),

        prices: yup.array().of(yup.object().shape({
            city_id: yup.string().required(t('validation.required')),
            price_per_service_period: yup.number().transform((value) => (isNaN(value) ? undefined : value)).required(t('validation.required')).min(0, t('validation.min_0')),
        })).min(1, t('validation.required')),
        workers: yup.array().of(yup.string()).min(1, t('validation.required')),
    });

    const { register, handleSubmit, watch, reset, setValue, control, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            status: 'active', type: 'hourly', cancel_action: 'fee', cancel_fee_type: 'fixed', no_show_policy: 'consumed',
            workers: [], features: [], prices: [{ ...EMPTY_PRICE }], schedules: buildSchedules([], { fallbackActive: true }),
        },
    });

    const watchType = watch('type');
    const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({ control, name: 'features' });
    const { fields: priceFields, append: appendPrice, remove: removePrice } = useFieldArray({ control, name: 'prices' });

    // Live preview for a freshly-picked image file (revoked on change/unmount).
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

    // Which language the name/description fields currently edit, and the live
    // status value for the inline option buttons.
    const [textLang, setTextLang] = useState(isArabic ? 'ar' : 'en');
    const statusValue = watch('status');

    const { data: fullServiceData, isLoading: isServiceLoading } = useQuery({
        queryKey: ['serviceDetails', serviceToEdit?.id],
        queryFn: async () => (await axiosInstance.get(`/admin/services/${serviceToEdit.id}`)).data.data,
        enabled: isEditMode,
    });

    useEffect(() => {
        if (isEditMode && fullServiceData) {
            const prices = (fullServiceData.prices || []).map((p) => ({
                city_id: String(p.city_id || ''),
                area_id: p.area_id ? String(p.area_id) : '',
                price_per_service_period: p.price_per_service_period || '',
                currency: p.currency || 'EGP',
                effective_start: p.effective_start || '',
                effective_end: p.effective_end || '',
            }));

            reset({
                category_id: String(fullServiceData.category?.id || ''),
                type: fullServiceData.type || 'hourly',
                name_ar: fullServiceData.name_ar || '',
                name_en: fullServiceData.name_en || '',
                description_ar: fullServiceData.description_ar || '',
                description_en: fullServiceData.description_en || '',
                status: fullServiceData.status || 'active',

                service_period_hours: fullServiceData.duration?.service_period_hours || '',
                min_contract_months: fullServiceData.duration?.min_contract_months || '',
                allowed_contract_durations: fullServiceData.duration?.allowed_contract_durations?.join(', ') || '',

                free_cancel_cutoff_hours: fullServiceData.rules?.free_cancel_cutoff_hours ?? '',
                reschedule_cutoff_hours: fullServiceData.rules?.reschedule_cutoff_hours ?? '',
                lead_time_min_hours: fullServiceData.rules?.lead_time_min_hours ?? '',
                lead_time_max_days: fullServiceData.rules?.lead_time_max_days ?? '',
                cancel_action: fullServiceData.rules?.late_cancel_action || 'fee',
                cancel_fee_type: fullServiceData.rules?.late_cancel_fee_type || 'fixed',
                cancel_fee_value: fullServiceData.rules?.late_cancel_fee_value || '',
                no_show_policy: fullServiceData.rules?.no_show_policy || 'consumed',
                max_changes_per_booking: fullServiceData.rules?.max_changes_per_booking ?? '',

                features: (fullServiceData.features || []).map((f) => ({ ar: f.ar || '', en: f.en || '' })),
                prices: prices.length ? prices : [{ ...EMPTY_PRICE }],

                workers: fullServiceData.workers?.map((w) => String(w.id)) || [],
                schedules: buildSchedules(fullServiceData.schedules),
            });
        }
    }, [fullServiceData, isEditMode, reset]);

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const payload = new FormData();
            if (isEditMode) payload.append('_method', 'PUT');

            payload.append('category_id', data.category_id);
            payload.append('type', data.type);
            payload.append('name_ar', data.name_ar);
            payload.append('name_en', data.name_en);
            if (data.description_ar) payload.append('description_ar', data.description_ar);
            if (data.description_en) payload.append('description_en', data.description_en);
            payload.append('status', data.status);
            if (data.image && data.image[0]) payload.append('image', data.image[0]);

            // Durations (DB-aligned)
            if (data.type === 'hourly' || data.type === 'both') {
                payload.append('durations[service_period_hours]', data.service_period_hours);
            }
            if (data.type === 'moqema' || data.type === 'both') {
                payload.append('durations[min_contract_months]', data.min_contract_months);
                data.allowed_contract_durations?.split(',').forEach((d) => {
                    if (d.trim()) payload.append('durations[allowed_contract_durations][]', d.trim());
                });
            }

            // Rules
            const appendRule = (key, val) => { if (val !== '' && val !== undefined && val !== null) payload.append(`rules[${key}]`, val); };
            appendRule('free_cancel_cutoff_hours', data.free_cancel_cutoff_hours);
            appendRule('reschedule_cutoff_hours', data.reschedule_cutoff_hours);
            appendRule('lead_time_min_hours', data.lead_time_min_hours);
            appendRule('lead_time_max_days', data.lead_time_max_days);
            appendRule('late_cancel_action', data.cancel_action);
            appendRule('late_cancel_fee_type', data.cancel_fee_type);
            appendRule('late_cancel_fee_value', data.cancel_fee_value);
            appendRule('no_show_policy', data.no_show_policy);
            appendRule('max_changes_per_booking', data.max_changes_per_booking);

            // Prices (one row per location) + coverages derived from the distinct locations
            const seenCoverage = new Set();
            let coverageIndex = 0;
            (data.prices || []).forEach((p, i) => {
                const areaId = p.area_id || null;
                payload.append(`prices[${i}][pricing_scope]`, areaId ? 'area' : 'city');
                payload.append(`prices[${i}][city_id]`, p.city_id);
                if (areaId) payload.append(`prices[${i}][area_id]`, areaId);
                payload.append(`prices[${i}][price_per_service_period]`, p.price_per_service_period);
                payload.append(`prices[${i}][currency]`, p.currency || 'EGP');
                if (p.effective_start) payload.append(`prices[${i}][effective_start]`, p.effective_start);
                if (p.effective_end) payload.append(`prices[${i}][effective_end]`, p.effective_end);

                const coverageKey = `${p.city_id}-${areaId || ''}`;
                if (!seenCoverage.has(coverageKey)) {
                    seenCoverage.add(coverageKey);
                    payload.append(`coverages[${coverageIndex}][city_id]`, p.city_id);
                    if (areaId) payload.append(`coverages[${coverageIndex}][area_id]`, areaId);
                    payload.append(`coverages[${coverageIndex}][status]`, 'active');
                    coverageIndex += 1;
                }
            });

            // Features (multiple, stored as JSON) — skip fully-empty rows
            let featureIndex = 0;
            (data.features || []).forEach((f) => {
                if (!f.ar && !f.en) return;
                if (f.ar) payload.append(`features[${featureIndex}][ar]`, f.ar);
                if (f.en) payload.append(`features[${featureIndex}][en]`, f.en);
                featureIndex += 1;
            });

            // Workers
            (data.workers || []).forEach((workerId) => payload.append('workers[]', workerId));

            // Weekly schedule — each day's shifts flattened into one row per shift.
            let scheduleRow = 0;
            (data.schedules || []).forEach((d) => {
                (d.shifts || []).forEach((shift) => {
                    payload.append(`schedules[${scheduleRow}][day]`, d.day);
                    payload.append(`schedules[${scheduleRow}][is_active]`, d.is_active ? 1 : 0);
                    payload.append(`schedules[${scheduleRow}][start_time]`, shift.start_time || DEFAULT_START);
                    payload.append(`schedules[${scheduleRow}][end_time]`, shift.end_time || DEFAULT_END);
                    scheduleRow += 1;
                });
            });

            const url = isEditMode ? `/admin/services/${serviceToEdit.id}` : '/admin/services';
            return axiosInstance.post(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || 'تمت العملية بنجاح');
            queryClient.invalidateQueries({ queryKey: ['services'] });
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء حفظ البيانات.');
        },
    });

    const onSubmit = (data) => submitMutation.mutate(data);
    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;
    // Prefer the freshly-picked file preview, otherwise the existing saved image.
    const displayImage = imagePreview || (isEditMode ? fullServiceData?.image : null);

    return (
        <div className="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-col font-main">

            {/* Sticky header */}
            <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 bg-white border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-800">{isEditMode ? t('form.title_edit') : t('form.title_add')}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors" aria-label={t('form.cancel')}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Scrollable body — form is a single centered column at 50% width */}
            <div className="flex-1 overflow-y-auto">
                {isEditMode && isServiceLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="flex flex-col items-center gap-3 text-[#E91E63]">
                            <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                            <span className="font-medium text-gray-600">جاري تحميل بيانات الخدمة...</span>
                        </div>
                    </div>
                ) : (
                    <form id="service-form" onSubmit={handleSubmit(onSubmit)} className="w-full md:w-1/2 mx-auto px-4 py-6 space-y-6">

                        {/* 1. Basic Info */}
                        <FormSection icon="info" title={t('sections.basic.title')} description={t('sections.basic.desc')}>

                            {/* Language of the name & description — left aligned, no label */}
                            <div className="flex">
                                <div className="flex gap-2 mr-auto">
                                    {[{ v: 'ar', l: 'العربية' }, { v: 'en', l: 'English' }].map(({ v, l }) => {
                                        const active = textLang === v;
                                        const hasErr = !!errors[`name_${v}`];
                                        return (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => setTextLang(v)}
                                                className={`relative px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${active ? 'bg-[#E91E63] text-white border-[#E91E63]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#E91E63]'}`}
                                            >
                                                {l}
                                                {hasErr && <span className="absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Image + (name above description) grouped together. The image
                                stretches from the top of the name to the bottom of the
                                description. In RTL it sits on the right, the text on the left. */}
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-stretch">
                                <div className="sm:w-44 shrink-0">
                                    <label
                                        htmlFor="service-image"
                                        className={`relative cursor-pointer flex items-center justify-center rounded-xl border-2 overflow-hidden h-full min-h-[160px] transition-colors ${displayImage ? 'border-solid border-gray-200' : 'border-dashed border-gray-200 hover:border-[#E91E63] hover:bg-[#FDF0F3]/30'}`}
                                    >
                                        {displayImage ? (
                                            <>
                                                <img src={displayImage} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
                                                <span className="absolute bottom-0 inset-x-0 bg-black/45 text-white text-xs py-1 text-center">{t('form.change_image')}</span>
                                            </>
                                        ) : (
                                            <span className="flex flex-col items-center gap-2 p-4 text-center">
                                                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FDF0F3] text-[#E91E63]">
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                                    </svg>
                                                </span>
                                                <span className="text-xs font-medium text-[#E91E63]">{t('form.upload_image')}</span>
                                            </span>
                                        )}
                                    </label>
                                    <input id="service-image" type="file" accept="image/*" {...register('image')} className="hidden" />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <label className={LABEL_CLASS}>{t('form.name')}</label>
                                        {textLang === 'ar' ? (
                                            <input key="name_ar" {...register('name_ar')} dir="rtl" className={`${INPUT_CLASS} ${errors.name_ar ? 'border-red-500' : ''}`} />
                                        ) : (
                                            <input key="name_en" {...register('name_en')} dir="ltr" className={`${INPUT_CLASS} ${errors.name_en ? 'border-red-500' : ''}`} />
                                        )}
                                        <ErrorMsg name={`name_${textLang}`} />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>{t('form.description')}</label>
                                        {textLang === 'ar' ? (
                                            <textarea key="desc_ar" {...register('description_ar')} dir="rtl" rows="3" className={INPUT_CLASS}></textarea>
                                        ) : (
                                            <textarea key="desc_en" {...register('description_en')} dir="ltr" rows="3" className={INPUT_CLASS}></textarea>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Two dropdowns beside each other */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.category')}</label>
                                    <SelectField registration={register('category_id')}>
                                        <option value="">-- {t('form.category')} --</option>
                                        {categories.map((cat) => <option key={cat.id} value={cat.id}>{isArabic ? cat.name_ar : cat.name_en}</option>)}
                                    </SelectField>
                                    <ErrorMsg name="category_id" />
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.type')}</label>
                                    <SelectField registration={register('type')}>
                                        <option value="hourly">{t('types.hourly')}</option>
                                        <option value="moqema">{t('types.moqema')}</option>
                                        <option value="both">{t('types.both')}</option>
                                    </SelectField>
                                </div>
                            </div>

                            {/* Status — radio cards, all options shown at once (not a dropdown) */}
                            <div>
                                <label className={LABEL_CLASS}>{t('form.status')}</label>
                                <StatusRadioGroup
                                    value={statusValue}
                                    onChange={(v) => setValue('status', v, { shouldValidate: true })}
                                    options={[
                                        { value: 'active', label: t('status.active'), dot: 'bg-green-500' },
                                        { value: 'inactive', label: t('status.inactive'), dot: 'bg-gray-400' },
                                    ]}
                                />
                            </div>
                        </FormSection>

                        {/* 2. Durations */}
                        <FormSection icon="clock" title={t('sections.duration.title')} description={t('sections.duration.desc')}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(watchType === 'hourly' || watchType === 'both') && (
                                    <div>
                                        <label className={LABEL_CLASS}>{t('form.service_period_hours')}</label>
                                        <input type="number" {...register('service_period_hours')} className={INPUT_CLASS} />
                                        <ErrorMsg name="service_period_hours" />
                                    </div>
                                )}
                                {(watchType === 'moqema' || watchType === 'both') && (
                                    <>
                                        <div>
                                            <label className={LABEL_CLASS}>{t('form.min_contract')}</label>
                                            <input type="number" {...register('min_contract_months')} className={INPUT_CLASS} />
                                            <ErrorMsg name="min_contract_months" />
                                        </div>
                                        <div>
                                            <label className={LABEL_CLASS}>{t('form.allowed_contracts')}</label>
                                            <input type="text" {...register('allowed_contract_durations')} dir="ltr" placeholder="1, 3, 6" className={`${INPUT_CLASS} text-left`} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </FormSection>

                        {/* 3. Coverage & Pricing (per location) */}
                        <FormSection
                            icon="location"
                            title={t('sections.prices.title')}
                            description={t('sections.prices.desc')}
                            action={<button type="button" onClick={() => appendPrice({ ...EMPTY_PRICE })} className="text-sm font-medium text-[#E91E63] hover:bg-[#FDF0F3] px-3 py-1.5 rounded-lg transition-colors">+ {t('form.add_price')}</button>}
                        >
                            {typeof errors.prices?.message === 'string' && <p className="text-red-500 text-xs">{errors.prices.message}</p>}
                            <div className="space-y-3">
                                {priceFields.map((field, index) => (
                                    <ServicePriceRow
                                        key={field.id}
                                        index={index}
                                        register={register}
                                        control={control}
                                        setValue={setValue}
                                        errors={errors}
                                        citiesList={citiesList}
                                        isArabic={isArabic}
                                        t={t}
                                        onRemove={() => removePrice(index)}
                                        canRemove={priceFields.length > 1}
                                    />
                                ))}
                            </div>
                        </FormSection>

                        {/* 4. Workers */}
                        <FormSection
                            icon="users"
                            title={t('sections.workers.title')}
                            description={t('sections.workers.desc')}
                            action={(watch('workers') || []).length > 0
                                ? <span className="text-xs font-medium text-[#E91E63] bg-[#FDF0F3] px-2.5 py-1 rounded-lg">{t('form.workers_selected', { num: (watch('workers') || []).length, defaultValue: `${(watch('workers') || []).length} selected` })}</span>
                                : null}
                        >
                            {/* Search */}
                            <div className="relative mb-2">
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
                                    className={`${INPUT_CLASS} ps-9`}
                                />
                            </div>

                            <div ref={workerScrollRef} className="flex flex-col gap-2 border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto bg-gray-50">
                                {isWorkersLoading ? (
                                    <span className="text-gray-500 text-sm">{t('loading')}</span>
                                ) : workersList.length === 0 ? (
                                    <span className="text-gray-500 text-sm">{t('no_data')}</span>
                                ) : (
                                    <>
                                        {workersList.map((worker) => (
                                            <label key={worker.id} className="flex items-center gap-2 cursor-pointer bg-white p-2.5 border border-gray-100 rounded hover:bg-[#FDF0F3] transition-colors">
                                                <input type="checkbox" value={String(worker.id)} {...register('workers')} className="w-4 h-4 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63]" />
                                                <span className="text-sm font-medium text-gray-700">{worker.name} <span className="text-xs text-gray-400 font-normal">({worker.nationality})</span></span>
                                            </label>
                                        ))}

                                        {/* Sentinel + load-more (auto on scroll, button as fallback) */}
                                        <div ref={workerSentinelRef} aria-hidden="true" className="h-px" />
                                        {isFetchingMoreWorkers ? (
                                            <span className="flex items-center justify-center gap-2 py-1 text-xs text-gray-500">
                                                <svg className="animate-spin h-4 w-4 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                                {t('loading')}
                                            </span>
                                        ) : hasMoreWorkers ? (
                                            <button type="button" onClick={() => fetchMoreWorkers()} className="text-xs font-medium text-[#E91E63] hover:bg-[#FDF0F3] py-1.5 rounded-lg transition-colors">
                                                {t('form.load_more', { defaultValue: 'Load more' })}
                                            </button>
                                        ) : null}
                                    </>
                                )}
                            </div>
                            <ErrorMsg name="workers" />
                        </FormSection>

                        {/* Weekly schedule */}
                        <FormSection icon="clock" title={t('sections.schedule.title')} description={t('sections.schedule.desc')}>
                            <div className="space-y-2">
                                {WEEK_DAYS.map((day, index) => (
                                    <ServiceDayShifts
                                        key={day}
                                        dayIndex={index}
                                        day={day}
                                        control={control}
                                        register={register}
                                        t={t}
                                    />
                                ))}
                            </div>
                        </FormSection>

                        {/* 5. Features (multiple) */}
                        <FormSection
                            icon="sparkles"
                            title={t('sections.features.title')}
                            description={t('sections.features.desc')}
                            action={<button type="button" onClick={() => appendFeature({ ar: '', en: '' })} className="text-sm font-medium text-[#E91E63] hover:bg-[#FDF0F3] px-3 py-1.5 rounded-lg transition-colors">+ {t('form.add_feature')}</button>}
                        >
                            {featureFields.length === 0 && <p className="text-gray-400 text-sm">{t('form.no_features')}</p>}
                            <div className="space-y-3">
                                {featureFields.map((field, index) => (
                                    <div key={field.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-semibold text-gray-500">{t('form.section_features')} #{index + 1}</span>
                                            <button type="button" onClick={() => removeFeature(index)} className="text-xs font-medium text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors">{t('form.remove')}</button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className={LABEL_CLASS}>{t('form.feature_ar')}</label>
                                                <input type="text" {...register(`features.${index}.ar`)} className={INPUT_CLASS} />
                                            </div>
                                            <div>
                                                <label className={LABEL_CLASS}>{t('form.feature_en')}</label>
                                                <input type="text" {...register(`features.${index}.en`)} className={INPUT_CLASS} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </FormSection>

                        {/* 6. Rules */}
                        <FormSection icon="shield" title={t('sections.rules.title')} description={t('sections.rules.desc')}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.free_cancel')}</label>
                                    <input type="number" {...register('free_cancel_cutoff_hours')} className={INPUT_CLASS} />
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.reschedule_cutoff')}</label>
                                    <input type="number" {...register('reschedule_cutoff_hours')} className={INPUT_CLASS} />
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.lead_time_min')}</label>
                                    <input type="number" {...register('lead_time_min_hours')} className={INPUT_CLASS} />
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.lead_time_max')}</label>
                                    <input type="number" {...register('lead_time_max_days')} className={INPUT_CLASS} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.cancel_action')}</label>
                                    <SelectField registration={register('cancel_action')}><option value="fee">Fee</option><option value="block">Block</option><option value="manual">Manual</option></SelectField>
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.cancel_fee_type')}</label>
                                    <SelectField registration={register('cancel_fee_type')}><option value="fixed">Fixed</option><option value="percent">Percent</option></SelectField>
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.no_show')}</label>
                                    <SelectField registration={register('no_show_policy')}><option value="consumed">Consumed</option><option value="compensate">Compensate</option></SelectField>
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.cancel_fee_value')}</label>
                                    <input type="number" {...register('cancel_fee_value')} className={INPUT_CLASS} />
                                </div>
                                <div>
                                    <label className={LABEL_CLASS}>{t('form.max_changes')}</label>
                                    <input type="number" min="0" {...register('max_changes_per_booking')} className={INPUT_CLASS} />
                                </div>
                            </div>
                        </FormSection>

                    </form>
                )}
            </div>

            {/* Sticky footer — buttons pinned to the centered form's edges:
                cancel on the left border, save on the right border. */}
            <div className="flex-shrink-0 py-4 border-t border-gray-100 bg-white">
                <div dir="ltr" className="w-full md:w-1/2 mx-auto px-4 flex items-center justify-between gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">{t('form.cancel')}</button>
                    <button type="submit" form="service-form" disabled={submitMutation.isPending || (isEditMode && isServiceLoading)} className="px-6 py-2.5 rounded-xl font-medium text-white bg-[#E91E63] hover:bg-[#D81B60] transition-colors disabled:opacity-70 min-w-[150px] flex justify-center items-center">
                        {submitMutation.isPending ? '...' : t('form.submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}
