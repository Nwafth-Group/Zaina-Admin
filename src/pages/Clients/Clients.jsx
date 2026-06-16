import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import ReviewUserModal from './ReviewUserModal.jsx';
import ResetPasswordModal from '../Users/ResetPasswordModal.jsx';
import RowActionsMenu, { ReviewIcon, KeyIcon, ToggleIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';

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
    const { t } = useTranslation('users');
    const queryClient = useQueryClient();

    const [currentPage, setCurrentPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [verification, setVerification] = useState('');

    const [reviewUserId, setReviewUserId] = useState(null);
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

    const toggleStatusMutation = useMutation({
        mutationFn: (userId) => axiosInstance.patch(`/admin/users/${userId}/toggle-status`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
        onError: (err) => toast.error(err.response?.data?.message || t('review_modal.error')),
    });

    const clients = data?.items || [];
    const meta = data?.meta;

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';

    if (isError) {
        return <div className="p-8 text-red-500 font-bold"> error happend {error.message}</div>;
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">

            {/* Header + search */}
            <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('clients.title')}</h2>

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
                </div>
            </div>

            {/* Verification status tab bar */}
            <div className="px-4 md:px-6 py-2.5 border-b border-gray-50 flex items-center justify-center gap-1 overflow-x-auto">
                {VERIFICATION_TABS.map((tab) => {
                    const active = verification === tab.value;
                    return (
                        <button
                            key={tab.value || 'all'}
                            onClick={() => selectVerification(tab.value)}
                            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-[#E91E63] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {t(tab.label)}
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">{t('table.name')}</th>
                            <th className="px-6 py-4">{t('table.email')}</th>
                            <th className="px-6 py-4">{t('table.phone')}</th>
                            <th className="px-6 py-4 text-center">{t('table.verification')}</th>
                            <th className="px-6 py-4 text-center">{t('table.status')}</th>
                            <th className="px-6 py-4 text-center">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">{t('loading')}</td>
                            </tr>
                        ) : clients.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">{t('no_data')}</td>
                            </tr>
                        ) : (
                            clients.map((client) => {
                                const vStatus = client.verification_status || 'unverified';
                                return (
                                    <tr key={client.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{client.full_name || '-'}</td>
                                        <td className="px-6 py-4">{client.email || '-'}</td>
                                        <td className="px-6 py-4" dir="ltr">{client.mobile_number || '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${VERIFICATION_STYLES[vStatus] || VERIFICATION_STYLES.unverified}`}>
                                                {t(`verification.${vStatus}`, { defaultValue: vStatus })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {client.status === 'active' ? t('status.active') : t('status.inactive')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <RowActionsMenu
                                                label={t('table.actions')}
                                                items={[
                                                    {
                                                        key: 'review',
                                                        label: t('actions.review'),
                                                        icon: <ReviewIcon />,
                                                        onClick: () => setReviewUserId(client.id),
                                                    },
                                                    {
                                                        key: 'reset',
                                                        label: t('actions.reset_password'),
                                                        icon: <KeyIcon />,
                                                        onClick: () => setResetPasswordUserId(client.id),
                                                    },
                                                    {
                                                        key: 'toggle',
                                                        label: t('actions.toggle_status'),
                                                        icon: <ToggleIcon />,
                                                        onClick: () => toggleStatusMutation.mutate(client.id),
                                                        disabled: toggleStatusMutation.isPending,
                                                    },
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <Pagination meta={meta} onPageChange={setCurrentPage} />

            {reviewUserId && <ReviewUserModal userId={reviewUserId} onClose={() => setReviewUserId(null)} />}
            {resetPasswordUserId && <ResetPasswordModal userId={resetPasswordUserId} onClose={() => setResetPasswordUserId(null)} />}
        </div>
    );
}
