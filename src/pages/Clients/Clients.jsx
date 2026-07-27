import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import ResetPasswordModal from '../Users/ResetPasswordModal.jsx';
import RowActionsMenu, { ReviewIcon, KeyIcon, ToggleIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';
import { hasPermission } from '../../utils/permissions.js';

// Quick-filter by KYC verification status (applies immediately).
const VERIFICATION_TABS = [
    { value: '', label: 'tabs.all' },
    { value: 'pending', label: 'verification.pending' },
    { value: 'approved', label: 'verification.approved' },
    { value: 'rejected', label: 'verification.rejected' },
    { value: 'unverified', label: 'verification.unverified' },
];

const VERIFICATION_STYLES = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
    unverified: 'bg-gray-100 text-gray-600',
};

export default function Clients() {
    const { t, i18n } = useTranslation('users');
    const navigate = useNavigate();
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [currentPage, setCurrentPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [verification, setVerification] = useState('');
    const [countsMap, setCountsMap] = useState({});

    const [resetPasswordUserId, setResetPasswordUserId] = useState(null);

    // Debounce the free-text search before it hits the API.
    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(id);
    }, [searchInput]);

    const selectVerification = (value) => {
        setVerification(value);
        setCurrentPage(1);
    };

    const queryString = useMemo(() => {
        const params = new URLSearchParams({ page: String(currentPage), type: 'customer' });
        if (search) params.append('search', search);
        if (verification) params.append('verification_status', verification);
        return params.toString();
    }, [currentPage, search, verification]);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['clients', queryString],
        queryFn: async () => (await axiosInstance.get(`/admin/users?${queryString}`)).data.data,
        keepPreviousData: true,
    });

    const clients = data?.items || [];
    const meta = data?.meta;
    const lastCountsRef = useRef({ all: 0, pending: 0, approved: 0, rejected: 0, unverified: 0 });
    if (data?.counts) {
        lastCountsRef.current = data.counts;
    }
    const counts = data?.counts || lastCountsRef.current;

    const toggleStatusMutation = useMutation({
        mutationFn: (userId) => axiosInstance.patch(`/admin/users/${userId}/toggle-status`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
        onError: (err) => toast.error(err.response?.data?.message || t('review_modal.error')),
    });

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';

    if (isError) {
        return <div className="p-8 text-red-500 font-bold"> error happend {error.message}</div>;
    }

    return (
        <div className="space-y-6 font-main w-full">
            {/* Header */}
            <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">
                    {isArabic ? 'إدارة العملاء' : 'Clients Management'}
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                    {isArabic ? 'عرض ومتابعة حسابات العملاء وتوثيق الهوية وتجميد الحسابات' : 'View customer accounts, verify identity documents, and manage account statuses.'}
                </p>
            </div>

            {/* Summary Metric Tab Cards (Matching Drivers Layout & Colors) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { value: '', labelAr: 'جميع العملاء', labelEn: 'All Clients', icon: '👥', color: 'bg-[#FDF0F3] border-[#fbdbe3]' },
                    { value: 'pending', labelAr: 'قيد التوثيق', labelEn: 'Pending Verification', icon: '⏳', color: 'bg-amber-50 border-amber-200' },
                    { value: 'approved', labelAr: 'حسابات موثقة', labelEn: 'Approved', icon: '✅', color: 'bg-emerald-50 border-emerald-200' },
                    { value: 'rejected', labelAr: 'توثيق مرفوض', labelEn: 'Rejected', icon: '❌', color: 'bg-rose-50 border-rose-200' },
                    { value: 'unverified', labelAr: 'غير موثقة', labelEn: 'Unverified', icon: '🔒', color: 'bg-gray-50 border-gray-200' },
                ].map((card) => {
                    const isActive = verification === card.value;
                    const countVal = counts[card.value || 'all'] ?? 0;

                    return (
                        <button
                            key={card.value || 'all'}
                            type="button"
                            onClick={() => selectVerification(card.value)}
                            className={`p-4 rounded-xl border  transition-all flex items-center justify-between outline-none ${
                                isActive
                                    ? `${card.color} ring-2 ring-[#E91E63]/30 shadow-sm`
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div>
                                <p className="text-xs font-bold text-gray-500">{isArabic ? card.labelAr : card.labelEn}</p>
                                <p className="text-2xl font-black text-gray-900 mt-1">{countVal}</p>
                            </div>
                            <div className="text-2xl">{card.icon}</div>
                        </button>
                    );
                })}
            </div>

            {/* Filter controls bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 gap-3 w-full md:w-auto">
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
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider ">
                                <th className="py-3.5 px-6 ">{t('table.name')}</th>
                                <th className="py-3.5 px-6 ">{t('table.email')}</th>
                                <th className="py-3.5 px-6 ">{t('table.phone')}</th>
                                <th className="py-3.5 px-6 ">{t('table.verification')}</th>
                                <th className="py-3.5 px-6 ">{t('table.status')}</th>
                                <th className="py-3.5 px-6 ">{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="py-12  text-xs text-gray-400 font-bold">{t('loading')}</td>
                                </tr>
                            ) : clients.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-12  text-xs text-gray-400 font-bold">{t('no_data')}</td>
                                </tr>
                            ) : (
                                clients.map((client) => {
                                    const vStatus = client.verification_status || 'unverified';
                                    return (
                                        <tr 
                                            key={client.id} 
                                            onClick={() => navigate(`/clients/${client.id}`)}
                                            className="hover:bg-gray-50/80 transition cursor-pointer text-xs "
                                        >
                                            <td className="py-3.5 px-6  font-bold text-gray-900">{client.full_name || '-'}</td>
                                            <td className="py-3.5 px-6  text-gray-600">{client.email || '-'}</td>
                                            <td className="py-3.5 px-6  font-medium text-gray-700" dir="ltr">{client.mobile_number || '-'}</td>
                                            <td className="py-3.5 px-6 ">
                                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${VERIFICATION_STYLES[vStatus] || VERIFICATION_STYLES.unverified}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${vStatus === 'approved' ? 'bg-emerald-500' : vStatus === 'pending' ? 'bg-amber-500 animate-pulse' : vStatus === 'rejected' ? 'bg-rose-500' : 'bg-gray-400'}`}></span>
                                                    {t(`verification.${vStatus}`, { defaultValue: vStatus })}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-6 ">
                                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${client.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${client.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                                    {client.status === 'active' ? t('status.active') : t('status.inactive')}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-6 " onClick={(e) => e.stopPropagation()}>
                                                <RowActionsMenu
                                                    label={t('table.actions')}
                                                    items={[
                                                        {
                                                            key: 'review',
                                                            label: t('actions.review'),
                                                            icon: <ReviewIcon />,
                                                            onClick: () => navigate(`/clients/${client.id}`),
                                                        },
                                                        hasPermission('users.edit') && {
                                                            key: 'reset',
                                                            label: t('actions.reset_password'),
                                                            icon: <KeyIcon />,
                                                            onClick: () => setResetPasswordUserId(client.id),
                                                        },
                                                        hasPermission('users.edit') && {
                                                            key: 'toggle',
                                                            label: t('actions.toggle_status'),
                                                            icon: <ToggleIcon />,
                                                            onClick: () => toggleStatusMutation.mutate(client.id),
                                                            disabled: toggleStatusMutation.isPending,
                                                        },
                                                    ].filter(Boolean)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <Pagination meta={meta} onPageChange={setCurrentPage} />

            {resetPasswordUserId && <ResetPasswordModal userId={resetPasswordUserId} onClose={() => setResetPasswordUserId(null)} />}
        </div>
    );
}
