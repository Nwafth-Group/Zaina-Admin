import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';
import ResetPasswordModal from './ResetPasswordModal.jsx';
import UserActionModal from './UserActionModal.jsx';
import RowActionsMenu, { EditIcon, KeyIcon, ToggleIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';

const DEFAULT_FILTERS = {
    status: '',
    type: '',
    role: '',
    sort_by: 'created_at',
    sort_dir: 'desc',
};

// This page manages internal admin accounts only — customers live on the Clients page.
const ADMIN_TYPES = ['operation', 'super_admin'];

// Primary quick-filter shown as a horizontal tab bar (applies immediately).
const TYPE_TABS = [
    { value: '', label: 'tabs.all' },
    { value: 'operation', label: 'types.operation' },
    { value: 'super_admin', label: 'types.super_admin' },
];

export default function Users() {
    const { t, i18n } = useTranslation('users');
    const queryClient = useQueryClient();
    const isArabic = i18n.language?.startsWith('ar');

    const [currentPage, setCurrentPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');              // committed search (applies live)
    const [filters, setFilters] = useState(DEFAULT_FILTERS); // committed drawer filters
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS); // staged until "Apply"
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [selectedUserId, setSelectedUserId] = useState(null);
    const [resetPasswordUserId, setResetPasswordUserId] = useState(null);

    // Debounce the free-text search before it hits the API.
    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(id);
    }, [searchInput]);

    const openFilters = () => {
        setDraftFilters(filters);
        setIsFilterOpen(true);
    };

    const updateDraft = (key, value) => setDraftFilters((d) => ({ ...d, [key]: value }));

    const handleSortChange = (value) => {
        const [sort_by, sort_dir] = value.split(':');
        setDraftFilters((d) => ({ ...d, sort_by, sort_dir }));
    };

    const applyFilters = () => {
        setFilters(draftFilters);
        setCurrentPage(1);
        setIsFilterOpen(false);
    };

    const resetFilters = () => {
        setSearchInput('');
        setSearch('');
        setFilters(DEFAULT_FILTERS);
        setDraftFilters(DEFAULT_FILTERS);
        setCurrentPage(1);
    };

    // Type tab bar commits to the live filters directly.
    const selectType = (value) => {
        setFilters((f) => ({ ...f, type: value }));
        setCurrentPage(1);
    };

    const queryString = useMemo(() => {
        const params = new URLSearchParams({ page: String(currentPage) });
        if (search) params.append('search', search);
        Object.entries(filters).forEach(([key, value]) => {
            if (key === 'type') return; // scoped to admin types below
            if (value !== '' && value != null) params.append(key, value);
        });
        // A specific tab filters that one type; the "All" tab still excludes
        // customers/drivers by listing only the admin account types.
        if (filters.type) {
            params.append('type', filters.type);
        } else {
            params.append('types', ADMIN_TYPES.join(','));
        }
        return params.toString();
    }, [currentPage, search, filters]);

    const nameSortValue = 'first_name:asc';
    // `type` is handled by the tab bar, so it's excluded from the drawer badge.
    const activeFilterCount =
        (filters.status ? 1 : 0) +
        (filters.role ? 1 : 0) +
        (filters.sort_by !== DEFAULT_FILTERS.sort_by || filters.sort_dir !== DEFAULT_FILTERS.sort_dir ? 1 : 0);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['users', queryString],
        queryFn: async () => (await axiosInstance.get(`/admin/users?${queryString}`)).data.data,
        keepPreviousData: true,
    });

    const { data: roles = [] } = useQuery({
        queryKey: ['roles-for-filter'],
        queryFn: async () => (await axiosInstance.get('/admin/roles')).data.data.items || [],
    });

    const toggleStatusMutation = useMutation({
        mutationFn: (userId) => axiosInstance.patch(`/admin/users/${userId}/toggle-status`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
        onError: () => alert('حدث خطأ أثناء تغيير الحالة.'),
    });

    const users = data?.items || [];
    const meta = data?.meta;

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';

    if (isError) {
        return <div className="p-8 text-red-500 font-bold"> error happend {error.message}</div>;
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">

            <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('title')}</h2>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[180px]">
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

                    {/* Filter button */}
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

            {/* Type quick-filter tab bar — selected tab is highlighted, others plain */}
            <div className="px-4 md:px-6 py-2.5 border-b border-gray-50 flex items-center justify-center gap-1 overflow-x-auto">
                {TYPE_TABS.map((tab) => {
                    const active = filters.type === tab.value;
                    return (
                        <button
                            key={tab.value || 'all'}
                            onClick={() => selectType(tab.value)}
                            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-[#E91E63] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {t(tab.label)}
                        </button>
                    );
                })}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">{t('table.name')}</th>
                            <th className="px-6 py-4">{t('table.email')}</th>
                            <th className="px-6 py-4">{t('table.phone')}</th>
                            <th className="px-6 py-4">{t('table.role')}</th>
                            <th className="px-6 py-4 text-center">{t('table.status')}</th>
                            <th className="px-6 py-4 text-center">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-3">
                                        <svg className="animate-spin h-5 w-5 text-[#E91E63]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {t('loading')}
                                    </div>
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">{t('no_data')}</td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.full_name || '-'}</td>
                                    <td className="px-6 py-4">{user.email || '-'}</td>
                                    <td className="px-6 py-4" dir="ltr">{user.mobile_number || '-'}</td>
                                    <td className="px-6 py-4">
                                        {user.primary_role || '-'}
                                        {user.additional_roles_count > 0 && (
                                            <span className="text-xs text-gray-400 ms-1">(+{user.additional_roles_count})</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {user.status === 'active' ? t('status.active') : t('status.inactive')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <RowActionsMenu
                                            label={t('table.actions')}
                                            items={[
                                                {
                                                    key: 'edit',
                                                    label: t('actions.edit_view'),
                                                    icon: <EditIcon />,
                                                    onClick: () => setSelectedUserId(user.id),
                                                },
                                                {
                                                    key: 'reset',
                                                    label: t('actions.reset_password'),
                                                    icon: <KeyIcon />,
                                                    onClick: () => setResetPasswordUserId(user.id),
                                                },
                                                {
                                                    key: 'toggle',
                                                    label: t('actions.toggle_status'),
                                                    icon: <ToggleIcon />,
                                                    onClick: () => toggleStatusMutation.mutate(user.id),
                                                    disabled: toggleStatusMutation.isPending,
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
            <Pagination meta={meta} onPageChange={setCurrentPage} />

            {/* Filter drawer (slides in from the left) */}
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
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.status_label')}</label>
                            <select value={draftFilters.status} onChange={(e) => updateDraft('status', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.all_statuses')}</option>
                                <option value="active">{t('status.active')}</option>
                                <option value="inactive">{t('status.inactive')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.role_label')}</label>
                            <select value={draftFilters.role} onChange={(e) => updateDraft('role', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.all_roles')}</option>
                                {roles.map((role) => (
                                    <option key={role.id} value={role.name}>{role.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.sort_label')}</label>
                            <select value={`${draftFilters.sort_by}:${draftFilters.sort_dir}`} onChange={(e) => handleSortChange(e.target.value)} className={`${selectClass} w-full`}>
                                <option value="created_at:desc">{t('filters.sort_newest')}</option>
                                <option value="created_at:asc">{t('filters.sort_oldest')}</option>
                                <option value={nameSortValue}>{t('filters.sort_name')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 flex items-center gap-3">
                        <button onClick={resetFilters} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors">
                            {t('filters.reset')}
                        </button>
                        <button onClick={applyFilters} className="flex-1 px-4 py-2 bg-[#E91E63] text-white rounded-lg hover:bg-[#D81B60] font-medium transition-colors">
                            {t('filters.done')}
                        </button>
                    </div>
                </aside>
            </div>

            {selectedUserId && <UserActionModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
            {resetPasswordUserId && <ResetPasswordModal userId={resetPasswordUserId} onClose={() => setResetPasswordUserId(null)} />}

        </div>
    );
}
