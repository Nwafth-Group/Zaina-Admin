import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import BookingDetailsModal from './BookingDetailsModal';
import RowActionsMenu, { EyeIcon, CancelIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';

const DEFAULT_FILTERS = {
    status: '',
    payment_status: '',
    category_ids: [],
    min_amount: '',
    max_amount: '',
    city_id: '',
    area_id: '',
    date_from: '',
    date_to: '',
    sort_by: 'created_at',
    sort_dir: 'desc',
};

// Status badge palette (status values come from the API verbatim).
const STATUS_STYLES = {
    Upcoming: 'bg-blue-50 text-blue-600 border-blue-200',
    inService: 'bg-amber-50 text-amber-600 border-amber-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
};

const PAYMENT_STYLES = {
    paid: 'bg-green-100 text-green-700',
    unpaid: 'bg-gray-100 text-gray-600',
    refunded: 'bg-purple-100 text-purple-700',
};

// Primary quick-filter shown as a horizontal tab bar (applies immediately).
const STATUS_TABS = [
    { value: '', label: 'tabs.all' },
    { value: 'Upcoming', label: 'status.Upcoming' },
    { value: 'inService', label: 'status.inService' },
    { value: 'completed', label: 'status.completed' },
    { value: 'cancelled', label: 'status.cancelled' },
];

export default function Bookings() {
    const { t, i18n } = useTranslation('bookings');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');              // committed search (applies live)
    const [filters, setFilters] = useState(DEFAULT_FILTERS); // committed drawer filters
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS); // staged until "Apply"
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [detailsId, setDetailsId] = useState(null);   // booking open in the details modal
    const [cancelTarget, setCancelTarget] = useState(null); // booking pending cancel confirm
    const [page, setPage] = useState(1);

    // Debounce the free-text search before it hits the API.
    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(id);
    }, [searchInput]);

    const openFilters = () => {
        setDraftFilters(filters);
        setIsFilterOpen(true);
    };

    const updateDraft = (key, value) => setDraftFilters((d) => ({ ...d, [key]: value }));

    // Toggle a category in/out of the multi-select set.
    const toggleCategory = (id) =>
        setDraftFilters((d) => {
            const set = new Set(d.category_ids);
            set.has(id) ? set.delete(id) : set.add(id);
            return { ...d, category_ids: [...set] };
        });

    // Picking a city resets the dependent area selection.
    const selectCity = (cityId) => setDraftFilters((d) => ({ ...d, city_id: cityId, area_id: '' }));

    const handleSortChange = (value) => {
        const [sort_by, sort_dir] = value.split(':');
        setDraftFilters((d) => ({ ...d, sort_by, sort_dir }));
    };

    const applyFilters = () => {
        setFilters(draftFilters);
        setPage(1);
        setIsFilterOpen(false);
    };

    const resetFilters = () => {
        setSearchInput('');
        setSearch('');
        setFilters(DEFAULT_FILTERS);
        setDraftFilters(DEFAULT_FILTERS);
        setPage(1);
    };

    // Status tab bar commits to the live filters directly.
    const selectStatus = (value) => {
        setFilters((f) => ({ ...f, status: value }));
        setPage(1);
    };

    const queryString = useMemo(() => {
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.append('search', search);
        Object.entries(filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                if (value.length) params.append(key, value.join(','));
            } else if (value !== '' && value != null) {
                params.append(key, value);
            }
        });
        return params.toString();
    }, [page, search, filters]);

    // `status` is handled by the tab bar, so it's excluded from the drawer badge.
    const activeFilterCount =
        (filters.payment_status ? 1 : 0) +
        (filters.category_ids.length ? 1 : 0) +
        (filters.min_amount || filters.max_amount ? 1 : 0) +
        (filters.city_id ? 1 : 0) +
        (filters.area_id ? 1 : 0) +
        (filters.date_from ? 1 : 0) +
        (filters.date_to ? 1 : 0) +
        (filters.sort_by !== DEFAULT_FILTERS.sort_by || filters.sort_dir !== DEFAULT_FILTERS.sort_dir ? 1 : 0);

    const { data: pageData, isLoading, isError, error } = useQuery({
        queryKey: ['bookings', queryString],
        queryFn: async () => {
            const response = await axiosInstance.get(`/admin/bookings?${queryString}`);
            return response.data.data;
        },
        keepPreviousData: true,
    });

    const bookings = pageData?.items || [];
    const meta = pageData?.meta;

    // Categories feed the category multi-select.
    const { data: categories = [] } = useQuery({
        queryKey: ['categoriesList'],
        queryFn: async () => (await axiosInstance.get('/admin/categories')).data.data.items || [],
    });

    // Cities feed the city dropdown.
    const { data: cities = [] } = useQuery({
        queryKey: ['citiesList'],
        queryFn: async () => (await axiosInstance.get('/admin/cities')).data.data.items || [],
    });

    // Areas are scoped to the city chosen inside the drawer (dependent dropdown).
    const { data: areas = [] } = useQuery({
        queryKey: ['areasList', draftFilters.city_id],
        queryFn: async () => (await axiosInstance.get(`/admin/areas?city_id=${draftFilters.city_id}`)).data.data.items || [],
        enabled: !!draftFilters.city_id,
    });

    // Cancelling a booking from the row menu (status -> cancelled, logged server-side).
    const cancelMutation = useMutation({
        mutationFn: (id) => axiosInstance.patch(`/admin/bookings/${id}/status`, { status: 'cancelled' }),
        onSuccess: (response) => {
            toast.success(response.data?.message || 'تم إلغاء الحجز');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            setCancelTarget(null);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء الإلغاء.');
        },
    });

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';

    if (isError) return <div className="p-8 text-red-500 font-bold">{error.message}</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">

            {/* Header: title + search + filters */}
            <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('title')}</h2>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400 pointer-events-none">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder={t('filters.search_placeholder')}
                            className={`${selectClass} w-full ps-9`}
                        />
                    </div>

                    <button
                        onClick={openFilters}
                        className="relative inline-flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 018 17v-3.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        <span>{t('filters.button')}</span>
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-2 -end-2 bg-[#E91E63] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Status quick-filter tab bar — selected tab highlighted, others plain */}
            <div className="px-4 md:px-6 py-2.5 border-b border-gray-50 flex items-center justify-center gap-1 overflow-x-auto">
                {STATUS_TABS.map((tab) => {
                    const active = filters.status === tab.value;
                    return (
                        <button
                            key={tab.value || 'all'}
                            onClick={() => selectStatus(tab.value)}
                            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-[#E91E63] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {t(tab.label)}
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="overflow-x-auto w-full">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500 min-w-[900px]">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-4">{t('table.ref')}</th>
                            <th className="px-4 py-4">{t('table.customer')}</th>
                            <th className="px-4 py-4">{t('table.service')}</th>
                            <th className="px-4 py-4">{t('table.visit_type')}</th>
                            <th className="px-4 py-4">{t('table.schedule')}</th>
                            <th className="px-4 py-4 text-center">{t('table.workers')}</th>
                            <th className="px-4 py-4 text-center">{t('table.amount')}</th>
                            <th className="px-4 py-4 text-center">{t('table.status')}</th>
                            <th className="px-4 py-4 text-center">{t('table.payment')}</th>
                            <th className="px-4 py-4 text-center">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-3">
                                        <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                                        </svg>
                                        <span className="text-lg font-medium">{t('loading')}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : bookings.length === 0 ? (
                            <tr>
                                <td colSpan="10" className="px-6 py-10 text-center text-gray-500">{t('no_data')}</td>
                            </tr>
                        ) : (
                            bookings.map((b) => (
                                <tr key={b.id} onClick={() => setDetailsId(b.id)} className="border-b transition-colors hover:bg-gray-50 bg-white cursor-pointer">
                                    {/* Reference */}
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">{b.booking_ref}</span>
                                    </td>
 
                                    {/* Customer */}
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-gray-800 line-clamp-1">{b.customer_name || '—'}</p>
                                        {b.customer_phone && <p className="text-xs text-gray-400 mt-0.5" dir="ltr">{b.customer_phone}</p>}
                                    </td>
 
                                    {/* Service */}
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-medium text-gray-600 line-clamp-1">{b.service_name || '—'}</span>
                                    </td>

                                    {/* Visit Type */}
                                    <td className="px-4 py-3">
                                        <span className="text-xs font-semibold bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border border-gray-100 whitespace-nowrap">
                                            {t(`visit_types.${b.visit_type}`, b.visit_type)}
                                        </span>
                                    </td>
 
                                    {/* Schedule */}
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-gray-700 whitespace-nowrap">{b.booking_date || '—'}</p>
                                        {b.time_slot && <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap" dir="ltr">{b.time_slot}</p>}
                                    </td>

                                    {/* Workers */}
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">{b.workers_count}</span>
                                    </td>

                                    {/* Amount */}
                                    <td className="px-4 py-3 text-center">
                                        <span className="font-bold text-gray-800 whitespace-nowrap">{b.total_amount} <span className="text-xs font-normal text-gray-400">{b.currency}</span></span>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${STATUS_STYLES[b.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                            {t(`status.${b.status}`, b.status)}
                                        </span>
                                    </td>

                                    {/* Payment */}
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${PAYMENT_STYLES[b.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                                            {t(`payment.${b.payment_status}`, b.payment_status)}
                                        </span>
                                    </td>

                                    {/* Actions — clicks here must not trigger the row's open-details handler */}
                                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <RowActionsMenu
                                            label={t('table.actions')}
                                            items={[
                                                {
                                                    key: 'details',
                                                    label: t('actions.show_details'),
                                                    icon: <EyeIcon />,
                                                    onClick: () => setDetailsId(b.id),
                                                },
                                                {
                                                    key: 'cancel',
                                                    label: t('actions.cancel'),
                                                    icon: <CancelIcon />,
                                                    danger: true,
                                                    hidden: b.status === 'completed' || b.status === 'cancelled',
                                                    onClick: () => setCancelTarget(b),
                                                },
                                            ]}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <Pagination meta={meta} onPageChange={setPage} />

            {/* Filter drawer */}
            <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${isFilterOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/40" onClick={() => setIsFilterOpen(false)} />
                <aside className={`absolute top-0 left-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${isFilterOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800">{t('filters.title')}</h3>
                        <button onClick={() => setIsFilterOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" aria-label="close">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.payment_label')}</label>
                            <select value={draftFilters.payment_status} onChange={(e) => updateDraft('payment_status', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.all_payments')}</option>
                                <option value="unpaid">{t('payment.unpaid')}</option>
                                <option value="paid">{t('payment.paid')}</option>
                                <option value="refunded">{t('payment.refunded')}</option>
                            </select>
                        </div>

                        {/* Categories — multi-select */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">
                                {t('filters.category_label')}
                                {draftFilters.category_ids.length > 0 && (
                                    <span className="ms-2 text-xs font-bold text-[#E91E63]">
                                        {t('filters.selected_count', { count: draftFilters.category_ids.length, defaultValue: '{{count}} selected' })}
                                    </span>
                                )}
                            </label>
                            <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-50">
                                {categories.length === 0 ? (
                                    <p className="px-3 py-2 text-sm text-gray-400">{t('filters.all_categories')}</p>
                                ) : (
                                    categories.map((c) => (
                                        <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={draftFilters.category_ids.includes(c.id)}
                                                onChange={() => toggleCategory(c.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-[#E91E63] focus:ring-[#E91E63]"
                                            />
                                            <span className="truncate">{isArabic ? c.name_ar : c.name_en}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Price range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.price_label')}</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" min="0" inputMode="numeric" value={draftFilters.min_amount} onChange={(e) => updateDraft('min_amount', e.target.value)} placeholder={t('filters.price_min')} className={`${selectClass} w-full`} />
                                <input type="number" min="0" inputMode="numeric" value={draftFilters.max_amount} onChange={(e) => updateDraft('max_amount', e.target.value)} placeholder={t('filters.price_max')} className={`${selectClass} w-full`} />
                            </div>
                        </div>

                        {/* Location — city + area side by side */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.location_label')}</label>
                            <div className="grid grid-cols-2 gap-2">
                                <select value={draftFilters.city_id} onChange={(e) => selectCity(e.target.value)} className={`${selectClass} w-full`}>
                                    <option value="">{t('filters.all_cities')}</option>
                                    {cities.map((c) => (
                                        <option key={c.id} value={c.id}>{isArabic ? c.name_ar : c.name_en}</option>
                                    ))}
                                </select>
                                <select value={draftFilters.area_id} onChange={(e) => updateDraft('area_id', e.target.value)} disabled={!draftFilters.city_id} className={`${selectClass} w-full disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed`}>
                                    <option value="">{draftFilters.city_id ? t('filters.all_areas') : t('filters.select_city_first')}</option>
                                    {areas.map((a) => (
                                        <option key={a.id} value={a.id}>{isArabic ? a.name_ar : a.name_en}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.date_from_label')}</label>
                                <input type="date" value={draftFilters.date_from} onChange={(e) => updateDraft('date_from', e.target.value)} className={`${selectClass} w-full`} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.date_to_label')}</label>
                                <input type="date" value={draftFilters.date_to} onChange={(e) => updateDraft('date_to', e.target.value)} className={`${selectClass} w-full`} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.sort_label')}</label>
                            <select value={`${draftFilters.sort_by}:${draftFilters.sort_dir}`} onChange={(e) => handleSortChange(e.target.value)} className={`${selectClass} w-full`}>
                                <option value="created_at:desc">{t('filters.sort_newest')}</option>
                                <option value="created_at:asc">{t('filters.sort_oldest')}</option>
                                <option value="booking_date:desc">{t('filters.sort_date')}</option>
                                <option value="total_amount:desc">{t('filters.sort_amount_high')}</option>
                                <option value="total_amount:asc">{t('filters.sort_amount_low')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 flex items-center gap-3">
                        <button
                            onClick={resetFilters}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                        >
                            {t('filters.reset')}
                        </button>
                        <button
                            onClick={applyFilters}
                            className="flex-1 px-4 py-2 bg-[#E91E63] text-white rounded-lg hover:bg-[#D81B60] font-medium transition-colors"
                        >
                            {t('filters.done')}
                        </button>
                    </div>
                </aside>
            </div>

            {/* Details modal */}
            {detailsId && (
                <BookingDetailsModal bookingId={detailsId} onClose={() => setDetailsId(null)} />
            )}

            {/* Cancel confirmation (row menu) */}
            {cancelTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setCancelTarget(null)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h4 className="text-lg font-bold text-gray-800 mb-2">{t('actions.cancel')}</h4>
                        <p className="text-sm text-gray-500 mb-1">{t('details.confirm_cancel')}</p>
                        <p className="text-sm font-mono font-bold text-gray-700 mb-5">{cancelTarget.booking_ref}</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setCancelTarget(null)} className="px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                                {t('details.keep')}
                            </button>
                            <button
                                onClick={() => cancelMutation.mutate(cancelTarget.id)}
                                disabled={cancelMutation.isPending}
                                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {t('details.confirm_cancel_btn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
