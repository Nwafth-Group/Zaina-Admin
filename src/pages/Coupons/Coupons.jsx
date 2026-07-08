import React, { useMemo, useState, useEffect } from 'react';
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

    // Toggle status mutation
    const toggleStatusMutation = useMutation({
        mutationFn: async (coupon) => {
            const fullDetails = (await axiosInstance.get(`/admin/coupons/${coupon.id}`)).data.data;
            const payload = {
                name: fullDetails.name,
                code: fullDetails.code,
                type: fullDetails.type,
                value: Number(fullDetails.value),
                max_discount: fullDetails.max_discount != null ? Number(fullDetails.max_discount) : null,
                min_booking_amount: Number(fullDetails.min_booking_amount),
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
                    allowed_shifts: s.pivot?.allowed_shifts || null,
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

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';

    if (isError) return <div className="p-8 text-red-500 font-bold">{error.message}</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">

            {/* Header */}
            <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('title')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
                </div>

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
                        onClick={() => setActionModal({ isOpen: true, couponToEdit: null })}
                        className="bg-[#E91E63] text-white px-5 py-2.5 rounded-full font-medium hover:bg-[#D81B60] transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {t('add_new')}
                    </button>
                </div>
            </div>

            {/* Status tabs */}
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
                <table className="w-full text-sm text-left rtl:text-right text-gray-500 min-w-[1000px]">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-4">{t('table.name')}</th>
                            <th className="px-4 py-4">{t('table.code')}</th>
                            <th className="px-4 py-4">{t('table.type')}</th>
                            <th className="px-4 py-4 text-center">{t('table.value')}</th>
                            <th className="px-4 py-4">{t('table.validity')}</th>
                            <th className="px-4 py-4 text-center">{t('table.usage')}</th>
                            <th className="px-4 py-4 text-center">{t('table.status')}</th>
                            <th className="px-4 py-4 text-center">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-3">
                                        <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                                        </svg>
                                        <span className="text-lg font-medium">{t('loading')}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : coupons.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-10 text-center text-gray-500">{t('no_data')}</td>
                            </tr>
                        ) : (
                            coupons.map((c) => (
                                <tr key={c.id} onClick={() => setDetailsId(c.id)} className="border-b transition-colors hover:bg-gray-50 bg-white cursor-pointer">
                                    {/* Name */}
                                    <td className="px-4 py-3 font-semibold text-gray-800">
                                        {c.name}
                                    </td>

                                    {/* Code */}
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-xs font-bold text-[#E91E63] bg-[#FDF0F3] px-2.5 py-1 rounded border border-[#FAD2DC] whitespace-nowrap">{c.code}</span>
                                    </td>

                                    {/* Type */}
                                    <td className="px-4 py-3 text-xs font-semibold text-gray-600">
                                        {t(`types.${c.type}`)}
                                    </td>

                                    {/* Value */}
                                    <td className="px-4 py-3 text-center font-bold text-gray-800">
                                        {c.type === 'percentage' ? `${c.value}%` : `${c.value} EGP`}
                                    </td>

                                    {/* Validity */}
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        <p className="font-medium text-gray-700">{c.start_date.substring(0, 10)}</p>
                                        <p className="text-gray-400 mt-0.5">{t('details.end_date')}: {c.end_date.substring(0, 10)}</p>
                                    </td>

                                    {/* Usage */}
                                    <td className="px-4 py-3 text-center text-xs">
                                        <span className="font-bold text-gray-800">{c.used_count}</span>
                                        <span className="text-gray-400 font-normal"> / {c.usage_limit ?? '∞'}</span>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${c.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                            {t(`status.${c.status}`)}
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
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
                                                    onClick: () => setActionModal({ isOpen: true, couponToEdit: c }),
                                                },
                                                {
                                                    key: 'toggle',
                                                    label: t('status.' + (c.status === 'active' ? 'inactive' : 'active')),
                                                    icon: <ToggleIcon />,
                                                    onClick: () => toggleStatusMutation.mutate(c),
                                                    disabled: toggleStatusMutation.isPending,
                                                },
                                                {
                                                    key: 'delete',
                                                    label: t('yes_delete'),
                                                    icon: <TrashIcon />,
                                                    danger: true,
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
