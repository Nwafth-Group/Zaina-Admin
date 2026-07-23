import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import RowActionsMenu, { EyeIcon, EditIcon, ToggleIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';
import CouponDetailsModal from './CouponDetailsModal';
import CouponActionModal from './CouponActionModal';

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const DEFAULT_FILTERS = { status: '' };

const STATUS_TABS = [
    { value: '', label: 'filters.status_all' },
    { value: 'active', label: 'filters.status_active' },
    { value: 'inactive', label: 'filters.status_inactive' },
];

export default function Coupons() {
    const { t, i18n } = useTranslation('coupons');
    const queryClient = useQueryClient();
    const isArabic = i18n.language?.startsWith('ar');

    const [actionModal, setActionModal] = useState({ isOpen: false, couponToEdit: null });
    const [detailsId, setDetailsId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [page, setPage] = useState(1);

    // Debounce search input
    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 400);
        return () => clearTimeout(id);
    }, [searchInput]);

    const selectStatus = (value) => {
        setFilters({ status: value });
        setPage(1);
    };

    const queryString = useMemo(() => {
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.append('search', search);
        if (filters.status) params.append('status', filters.status);
        return params.toString();
    }, [page, search, filters]);

    // Fetch coupons list
    const { data: pageData, isLoading, isError, error } = useQuery({
        queryKey: ['coupons', queryString],
        queryFn: async () => {
            const response = await axiosInstance.get(`/admin/coupons?${queryString}`);
            return response.data.data;
        },
        keepPreviousData: true,
    });

    const coupons = pageData?.items || [];
    const meta = pageData?.meta;
    const lastCountsRef = useRef({ all: 0, active: 0, inactive: 0, fixed: 0, percentage: 0 });
    if (pageData?.counts) {
        lastCountsRef.current = pageData.counts;
    }
    const counts = pageData?.counts || lastCountsRef.current;

    // Toggle status mutation
    const toggleStatusMutation = useMutation({
        mutationFn: async (coupon) => {
            const fullDetails = (await axiosInstance.get(`/admin/coupons/${coupon.id}`)).data.data;
            const payload = {
                name: fullDetails.name,
                code: fullDetails.code,
                type: fullDetails.type,
                value: Number(fullDetails.value),
                start_date: fullDetails.start_date,
                end_date: fullDetails.end_date,
                usage_limit: fullDetails.usage_limit != null ? Number(fullDetails.usage_limit) : null,
                user_usage_limit: Number(fullDetails.user_usage_limit),
                completed_bookings_count: Number(fullDetails.completed_bookings_count),
                is_for_all_users: Boolean(fullDetails.is_for_all_users),
                is_for_all_cities: Boolean(fullDetails.is_for_all_cities),
                is_for_all_services: Boolean(fullDetails.is_for_all_services),
                status: fullDetails.status === 'active' ? 'inactive' : 'active',
            };
            if (!fullDetails.is_for_all_users) {
                payload.users = (fullDetails.users || []).map(u => u.id);
            }
            if (!fullDetails.is_for_all_cities) {
                payload.cities = (fullDetails.cities || []).map(c => c.id);
            }
            if (fullDetails.areas && fullDetails.areas.length > 0) {
                payload.areas = fullDetails.areas.map(a => a.id);
            }
            if (!fullDetails.is_for_all_services) {
                payload.services = (fullDetails.services || []).map(s => ({
                    id: s.id,
                    allowed_visit_types: s.pivot?.allowed_visit_types || null,
                }));
            }
            return axiosInstance.put(`/admin/coupons/${coupon.id}`, payload);
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || t('toggled'));
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
            queryClient.invalidateQueries({ queryKey: ['couponDetail'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || t('error', { defaultValue: 'Error updating status' }));
        },
    });

    // Delete coupon mutation
    const deleteMutation = useMutation({
        mutationFn: (id) => axiosInstance.delete(`/admin/coupons/${id}`),
        onSuccess: (response) => {
            toast.success(response.data?.message || t('deleted'));
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
            setDeleteTarget(null);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || t('error', { defaultValue: 'Error deleting coupon' }));
        },
    });

    if (isError) return <div className="p-8 text-red-500 font-bold">{error.message}</div>;

    const COUPON_TABS = [
        { key: 'all', statusValue: '', label: t('filters.status_all'), icon: '🎟️', activeClass: 'bg-[#E91E63] text-white border-[#E91E63] shadow-md', iconBg: 'bg-pink-50 text-[#E91E63]' },
        { key: 'active', statusValue: 'active', label: t('filters.status_active'), icon: '✅', activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-md', iconBg: 'bg-emerald-50 text-emerald-600' },
        { key: 'inactive', statusValue: 'inactive', label: t('filters.status_inactive'), icon: '🔒', activeClass: 'bg-rose-600 text-white border-rose-600 shadow-md', iconBg: 'bg-rose-50 text-rose-600' },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900">
                        {isArabic ? 'إدارة قسائم الخصم والكوبونات' : 'Coupons Management'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'إنشاء وتخصيص كوبونات الخصم وقواعد الاستخدام والقيود على الخدمات والمدن' : 'Manage coupon codes, discount types, validity rules, and redemptions.'}
                    </p>
                </div>
            </div>

            {/* Summary Metric Tab Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {COUPON_TABS.map((tab) => {
                    const isSelected = filters.status === tab.statusValue;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => selectStatus(tab.statusValue)}
                            className={`p-4 rounded-xl border text-right transition flex items-center justify-between ${isSelected ? tab.activeClass : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                        >
                            <div>
                                <p className={`text-xs font-bold ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                                    {tab.label}
                                </p>
                                <p className="text-2xl font-black mt-1">
                                    {counts[tab.key] ?? 0}
                                </p>
                            </div>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${isSelected ? 'bg-white/20 text-white' : tab.iconBg}`}>
                                {tab.icon}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Filter controls bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full md:w-auto">
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

                <button
                    type="button"
                    onClick={() => setActionModal({ isOpen: true, couponToEdit: null })}
                    className="bg-[#E91E63] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#D81B60] transition shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{t('add_new')}</span>
                </button>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">
                                <th className="py-3.5 px-4 text-center">{t('table.name')}</th>
                                <th className="py-3.5 px-4 text-center">{t('table.code')}</th>
                                <th className="py-3.5 px-4 text-center">{t('table.type')}</th>
                                <th className="py-3.5 px-4 text-center">{t('table.value')}</th>
                                <th className="py-3.5 px-4 text-center">{t('table.validity')}</th>
                                <th className="py-3.5 px-4 text-center">{t('table.usage')}</th>
                                <th className="py-3.5 px-4 text-center">{t('table.status')}</th>
                                <th className="py-3.5 px-4 text-center">{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" className="py-12 text-center text-gray-400">
                                        <div className="flex justify-center items-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                            <span className="font-bold text-gray-500">{t('loading')}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : coupons.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-12 text-center text-gray-400 font-bold">{t('no_data')}</td>
                                </tr>
                            ) : (
                                coupons.map((c) => (
                                    <tr key={c.id} onClick={() => setDetailsId(c.id)} className="hover:bg-gray-50/80 transition-colors cursor-pointer text-center">
                                        <td className="py-3 px-4 text-center font-bold text-gray-900">{c.name}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="font-mono text-xs font-black text-[#E91E63] bg-pink-50 px-2.5 py-1 rounded border border-pink-100 whitespace-nowrap">{c.code}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold text-gray-600">
                                            {t(`types.${c.type}`)}
                                        </td>
                                        <td className="py-3 px-4 text-center font-black text-gray-900">
                                            {c.type === 'percentage' ? `${c.value}%` : `${c.value} EGP`}
                                        </td>
                                        <td className="py-3 px-4 text-center text-[11px] text-gray-500">
                                            <p className="font-bold text-gray-700">{c.start_date.substring(0, 10)}</p>
                                            <p className="text-gray-400 mt-0.5">{t('details.end_date')}: {c.end_date.substring(0, 10)}</p>
                                        </td>
                                        <td className="py-3 px-4 text-center text-xs">
                                            <span className="font-black text-gray-900">{c.used_count}</span>
                                            <span className="text-gray-400 font-normal"> / {c.usage_limit ?? '∞'}</span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${
                                                c.status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                {t(`status.${c.status}`)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <RowActionsMenu
                                                label={t('table.actions')}
                                                items={[
                                                    {
                                                        key: 'details',
                                                        label: t('details.title'),
                                                        icon: <EyeIcon />,
                                                        onClick: () => setDetailsId(c.id),
                                                    },
                                                    {
                                                        key: 'edit',
                                                        label: t('form.title_edit'),
                                                        icon: <EditIcon />,
                                                        disabled: !!(c.end_date && new Date(c.end_date) < new Date()) || !!(c.usage_limit !== null && c.used_count >= c.usage_limit),
                                                        onClick: () => setActionModal({ isOpen: true, couponToEdit: c }),
                                                    },
                                                    {
                                                        key: 'toggle',
                                                        label: t('status.' + (c.status === 'active' ? 'inactive' : 'active')),
                                                        icon: <ToggleIcon />,
                                                        onClick: () => toggleStatusMutation.mutate(c),
                                                        disabled: toggleStatusMutation.isPending || !!(c.end_date && new Date(c.end_date) < new Date()) || !!(c.usage_limit !== null && c.used_count >= c.usage_limit),
                                                    },
                                                    {
                                                        key: 'delete',
                                                        label: t('yes_delete'),
                                                        icon: <TrashIcon />,
                                                        danger: true,
                                                        disabled: c.used_count > 0 || !!(c.end_date && new Date(c.end_date) < new Date()) || !!(c.usage_limit !== null && c.used_count >= c.usage_limit),
                                                        onClick: () => setDeleteTarget(c),
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
            </div>

            {/* Pagination */}
            <Pagination meta={meta} onPageChange={setPage} />

            {/* Details Modal */}
            {detailsId && (
                <CouponDetailsModal couponId={detailsId} onClose={() => setDetailsId(null)} />
            )}

            {/* Action Form Modal */}
            {actionModal.isOpen && (
                <CouponActionModal
                    couponToEdit={actionModal.couponToEdit}
                    onClose={() => setActionModal({ isOpen: false, couponToEdit: null })}
                />
            )}

            {/* Delete Confirmation Dialog */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h4 className="text-lg font-bold text-gray-800 mb-2">{t('delete_confirm')}</h4>
                        <p className="text-sm text-gray-500 mb-4">{deleteTarget.name} ({deleteTarget.code})</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm">
                                {t('keep')}
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                                disabled={deleteMutation.isPending}
                                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                            >
                                {t('yes_delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
