import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import RescheduleBookingModal from './RescheduleBookingModal';
import RowActionsMenu, { EyeIcon, CancelIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';
import { hasPermission } from '../../utils/permissions.js';

const DEFAULT_FILTERS = {
    status: '',
    payment_status: '',
    service_zone_id: '',
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
    const navigate = useNavigate();
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');              // committed search (applies live)
    const [filters, setFilters] = useState(DEFAULT_FILTERS); // committed drawer filters
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS); // staged until "Apply"
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [cancelTarget, setCancelTarget] = useState(null); // booking pending cancel confirm
    const [cancelNote, setCancelNote] = useState('');
    const [rescheduleTarget, setRescheduleTarget] = useState(null);
    const [page, setPage] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const [countsMap, setCountsMap] = useState({});

    const handleExportExcel = async () => {
        try {
            setIsExporting(true);
            const params = new URLSearchParams();

            if (search.trim()) params.append('search', search.trim());
            if (filters.status) params.append('status', filters.status);
            if (filters.payment_status) params.append('payment_status', filters.payment_status);
            if (filters.service_zone_id) params.append('service_zone_id', filters.service_zone_id);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);
            if (filters.sort_by) params.append('sort_by', filters.sort_by);
            if (filters.sort_dir) params.append('sort_dir', filters.sort_dir);

            const response = await axiosInstance.get(`/admin/bookings/export?${params.toString()}`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.ms-excel;charset=utf-8;' }));
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `bookings_export_${dateStr}.xls`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            
            toast.success(isArabic ? 'تم تصدير ملف الإكسل بنجاح' : 'Bookings exported successfully');
        } catch (err) {
            toast.error(isArabic ? 'حدث خطأ أثناء تصدير البيانات' : 'Failed to export bookings');
        } finally {
            setIsExporting(false);
        }
    };

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

    // Fetch Geo-fenced Service Zones for filtering
    const { data: serviceZonesList = [] } = useQuery({
        queryKey: ['serviceZonesList'],
        queryFn: async () => {
            const res = (await axiosInstance.get('/admin/service-zones?per_page=100')).data;
            return res?.data?.items || res?.data || [];
        },
    });

    // `status` is handled by the tab bar, so it's excluded from the drawer badge.
    const activeFilterCount =
        (filters.payment_status ? 1 : 0) +
        (filters.service_zone_id ? 1 : 0) +
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
    const lastCountsRef = useRef({ all: 0, Upcoming: 0, inService: 0, completed: 0, cancelled: 0 });
    if (pageData?.counts) {
        lastCountsRef.current = pageData.counts;
    }
    const counts = pageData?.counts || lastCountsRef.current;

    // Categories feed the category multi-select.
    const { data: categories = [] } = useQuery({
        queryKey: ['categoriesList'],
        queryFn: async () => (await axiosInstance.get('/admin/categories')).data.data.items || [],
    });



    // Cancelling a booking from the row menu (status -> cancelled, logged server-side).
    const cancelMutation = useMutation({
        mutationFn: ({ id, note }) => axiosInstance.patch(`/admin/bookings/${id}/status`, { status: 'cancelled', ...(note ? { note } : {}) }),
        onSuccess: (response) => {
            toast.success(response.data?.message || 'تم إلغاء الحجز');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            setCancelTarget(null);
            setCancelNote('');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء الإلغاء.');
        },
    });

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';

    if (isError) return <div className="p-8 text-red-500 font-bold">{error.message}</div>;

    return (
        <div className="space-y-6 font-main w-full">
            {/* Header */}
            <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">
                    {isArabic ? 'إدارة الحجوزات' : 'Bookings Management'}
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                    {isArabic ? 'متابعة وإدارة كافة الحجوزات والزيارات والتخصيص وحالات الدفع في النظام' : 'Track and manage all service bookings, visit schedules, and payments.'}
                </p>
            </div>

            {/* Summary Metric Tab Cards (Matching Drivers Layout & Colors) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { value: '', labelKey: 'tabs.all', icon: '📅', color: 'bg-[#FDF0F3] border-[#fbdbe3]' },
                    { value: 'Upcoming', labelKey: 'status.Upcoming', icon: '🔹', color: 'bg-blue-50 border-blue-200' },
                    { value: 'inService', labelKey: 'status.inService', icon: '⏳', color: 'bg-amber-50 border-amber-200' },
                    { value: 'completed', labelKey: 'status.completed', icon: '✅', color: 'bg-emerald-50 border-emerald-200' },
                    { value: 'cancelled', labelKey: 'status.cancelled', icon: '❌', color: 'bg-rose-50 border-rose-200' },
                ].map((card) => {
                    const isActive = filters.status === card.value;
                    const countVal = counts[card.value || 'all'] ?? 0;

                    return (
                        <button
                            key={card.value || 'all'}
                            type="button"
                            onClick={() => selectStatus(card.value)}
                            className={`p-4 rounded-xl border  transition-all flex items-center justify-between outline-none ${
                                isActive
                                    ? `${card.color} ring-2 ring-[#E91E63]/30 shadow-sm`
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div>
                                <p className="text-xs font-bold text-gray-500">{t(card.labelKey)}</p>
                                <p className="text-2xl font-black text-gray-900 mt-1">{countVal}</p>
                            </div>
                            <div className="text-2xl">{card.icon}</div>
                        </button>
                    );
                })}
            </div>

            {/* Filter controls bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex flex-1 gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder={t('filters.search_placeholder')}
                            className="w-full pr-9 pl-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#E91E63]"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                    </div>

                    {/* Drawer filter trigger */}
                    <button
                        type="button"
                        onClick={openFilters}
                        className="relative inline-flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 018 17v-3.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        <span>{t('filters.button')}</span>
                        {activeFilterCount > 0 && (
                            <span className="bg-[#E91E63] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {/* Export Excel */}
                    <button
                        type="button"
                        disabled={isExporting}
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-2 border border-emerald-200 rounded-lg px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition shadow-sm disabled:opacity-50 shrink-0"
                    >
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{isExporting ? (isArabic ? 'جاري التصدير...' : 'Exporting...') : (isArabic ? 'تصدير إكسل' : 'Export Excel')}</span>
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full  border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider ">
                                <th className="py-3.5 px-4 ">{t('table.ref')}</th>
                                <th className="py-3.5 px-4 ">{t('table.customer')}</th>
                                <th className="py-3.5 px-4 ">{t('table.service_visit_type')}</th>
                                <th className="py-3.5 px-4  whitespace-nowrap">{t('table.price_type')}</th>
                                <th className="py-3.5 px-4 ">{t('table.schedule')}</th>
                                <th className="py-3.5 px-4 ">{t('table.assigned_workers')}</th>
                                <th className="py-3.5 px-4 ">{t('table.amount')}</th>
                                <th className="py-3.5 px-4 ">{t('table.status')}</th>
                                <th className="py-3.5 px-4 ">{t('table.payment')}</th>
                                <th className="py-3.5 px-4 ">{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="10" className="py-12  text-xs text-gray-400 font-bold">
                                        {isArabic ? 'جاري تحميل الحجوزات...' : 'Loading bookings...'}
                                    </td>
                                </tr>
                            ) : bookings.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="py-12  text-xs text-gray-400 font-bold">
                                        {t('no_data')}
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((b) => (
                                    <tr key={b.id} onClick={() => navigate(`/bookings/${b.id}`)} className="hover:bg-gray-50/80 transition cursor-pointer text-xs ">
                                        {/* Reference */}
                                        <td className="py-3.5 px-4 ">
                                            <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">{b.booking_ref}</span>
                                        </td>
     
                                        {/* Customer */}
                                        <td className="py-3.5 px-4 ">
                                            <p className="font-bold text-gray-900 line-clamp-1">{b.customer_name || '—'}</p>
                                            {b.customer_phone && <p className="text-[11px] text-gray-400 mt-0.5" dir="ltr">{b.customer_phone}</p>}
                                        </td>
     
                                        {/* Service / Visit Type */}
                                        <td className="py-3.5 px-4 ">
                                            <p className="font-bold text-gray-800 line-clamp-1">{b.service_name || '—'}</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5 whitespace-nowrap">
                                                {t(`visit_types.${b.visit_type}`, b.visit_type)}
                                            </p>
                                        </td>
    
                                        {/* Price Type */}
                                        <td className="py-3.5 px-4 ">
                                            <span className="text-gray-600 whitespace-nowrap">
                                                {t(`pricing_types.${b.pricing_type}`, b.pricing_type)}
                                            </span>
                                        </td>
     
                                        {/* Schedule */}
                                        <td className="py-3.5 px-4 ">
                                            <p className="font-bold text-gray-800 whitespace-nowrap">{b.booking_date || '—'}</p>
                                            {b.time_slot && <p className="text-[11px] text-gray-400 mt-0.5 whitespace-nowrap" dir="ltr">{b.time_slot}</p>}
                                        </td>
    
                                        {/* Workers */}
                                        <td className="py-3.5 px-4 ">
                                            <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">{b.workers_count}</span>
                                        </td>
    
                                        {/* Amount */}
                                        <td className="py-3.5 px-4 ">
                                            <span className="font-black text-gray-900 whitespace-nowrap">{b.total_amount} <span className="text-[10px] font-normal text-gray-400">{b.currency}</span></span>
                                        </td>
    
                                        {/* Status */}
                                        <td className="py-3.5 px-4 ">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${STATUS_STYLES[b.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                {t(`status.${b.status}`, b.status)}
                                            </span>
                                        </td>
    
                                        {/* Payment */}
                                        <td className="py-3.5 px-4 ">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${PAYMENT_STYLES[b.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                                                {t(`payment.${b.payment_status}`, b.payment_status)}
                                            </span>
                                        </td>
    
                                        {/* Actions — clicks here must not trigger the row's open-details handler */}
                                        <td className="px-4 py-3 " onClick={(e) => e.stopPropagation()}>
                                        <RowActionsMenu
                                            label={t('table.actions')}
                                            items={[
                                                {
                                                    key: 'details',
                                                    label: t('actions.show_details'),
                                                    icon: <EyeIcon />,
                                                    onClick: () => navigate(`/bookings/${b.id}`),
                                                },
                                                hasPermission('bookings.edit') && {
                                                    key: 'reschedule',
                                                    label: t('actions.reschedule'),
                                                    icon: (
                                                        <svg className="w-4 h-4 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    ),
                                                    hidden: b.status !== 'Upcoming' && b.status !== 'Pending Assignment',
                                                    onClick: () => setRescheduleTarget(b),
                                                },
                                                hasPermission('bookings.edit') && {
                                                    key: 'cancel',
                                                    label: t('actions.cancel'),
                                                    icon: <CancelIcon />,
                                                    danger: true,
                                                    hidden: b.status !== 'Upcoming' && b.status !== 'Pending Assignment',
                                                    onClick: () => setCancelTarget(b),
                                                },
                                            ].filter(Boolean)}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

            {/* Pagination */}
            <Pagination meta={meta} onPageChange={setPage} />

            {/* Filter drawer */}
            <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${isFilterOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/40" onClick={() => setIsFilterOpen(false)} />
                <aside className={`absolute top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${
                    isArabic
                        ? `left-0 ${isFilterOpen ? 'translate-x-0' : '-translate-x-full'}`
                        : `right-0 ${isFilterOpen ? 'translate-x-0' : 'translate-x-full'}`
                }`}>
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
                                <option value="paid">{t('payment.paid')}</option>
                                <option value="refunded">{t('payment.refunded')}</option>
                            </select>
                        </div>



                        {/* Location — Geo-Fenced Service Zone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{isArabic ? 'منطقة التغطية الجغرافية' : 'Service Zone'}</label>
                            <select value={draftFilters.service_zone_id} onChange={(e) => updateDraft('service_zone_id', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{isArabic ? 'جميع المناطق الجغرافية' : 'All Service Zones'}</option>
                                {serviceZonesList.map((z) => (
                                    <option key={z.id} value={z.id}>{z.name}</option>
                                ))}
                            </select>
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


            {/* Cancel confirmation (row menu) */}
            {cancelTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => { setCancelTarget(null); setCancelNote(''); }} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h4 className="text-lg font-bold text-gray-800 mb-2">{t('actions.cancel')}</h4>
                        <p className="text-sm text-gray-500 mb-4">{t('details.confirm_cancel')}</p>
                        <p className="text-sm font-mono font-bold text-gray-700 mb-4">{cancelTarget.booking_ref}</p>
                        <textarea
                            value={cancelNote}
                            onChange={(e) => setCancelNote(e.target.value)}
                            rows="3"
                            placeholder={t('details.cancel_reason')}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#E91E63] transition-colors mb-4 text-sm"
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setCancelTarget(null); setCancelNote(''); }} className="px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                                {t('details.keep')}
                            </button>
                            <button
                                onClick={() => cancelMutation.mutate({ id: cancelTarget.id, note: cancelNote.trim() })}
                                disabled={cancelMutation.isPending || !cancelNote.trim()}
                                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('details.confirm_cancel_btn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {rescheduleTarget && (
                <RescheduleBookingModal
                    booking={rescheduleTarget}
                    onClose={() => setRescheduleTarget(null)}
                />
            )}
        </div>
    );
}
