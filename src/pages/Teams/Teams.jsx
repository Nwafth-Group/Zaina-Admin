import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import TeamActionModal from './TeamActionModal';
import TeamDetailsModal from './TeamDetailsModal';
import RowActionsMenu, { EditIcon, ToggleIcon, TrashIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';
import { hasPermission } from '../../utils/permissions.js';

const DEFAULT_FILTERS = {
    status: '',
    service_id: '',
    sort_by: 'created_at',
    sort_dir: 'desc',
};

export default function Teams() {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const queryClient = useQueryClient();
    const isArabic = i18n.language?.startsWith('ar');

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Modals
    const [actionModal, setActionModal] = useState({ isOpen: false, teamToEdit: null });
    const [detailsModal, setDetailsModal] = useState({ isOpen: false, teamId: null });
    const [deleteConfirm, setDeleteConfirm] = useState({
        isOpen: false,
        teamId: null,
        teamName: '',
        workersCount: 0,
    });

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
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

    const queryString = useMemo(() => {
        const params = new URLSearchParams({ page: String(page), per_page: '10' });
        if (search) params.append('search', search);
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== '' && value != null) params.append(key, value);
        });
        return params.toString();
    }, [page, search, filters]);

    const activeFilterCount =
        (filters.status ? 1 : 0) +
        (filters.service_id ? 1 : 0) +
        (filters.sort_by !== DEFAULT_FILTERS.sort_by || filters.sort_dir !== DEFAULT_FILTERS.sort_dir ? 1 : 0);

    // 1. Fetch Teams
    const { data: teamsResp, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['teams', queryString],
        queryFn: async () => {
            const res = await axiosInstance.get(`/admin/teams?${queryString}`);
            return res.data?.data;
        },
        keepPreviousData: true,
    });

    // 2. Fetch Specialized Services for Filter Drawer
    const { data: specializedServices = [] } = useQuery({
        queryKey: ['teams-filter-services'],
        queryFn: async () => {
            const res = await axiosInstance.get('/admin/services?per_page=100');
            const all = res.data?.data?.items || [];
            return all.filter((s) => s.is_team_based);
        },
    });

    // 3. Toggle Team Status Mutation
    const toggleStatusMutation = useMutation({
        mutationFn: async (team) => {
            const nextStatus = team.status === 'active' ? 'inactive' : 'active';
            return axiosInstance.put(`/admin/teams/${team.id}`, {
                name_ar: team.name_ar,
                name_en: team.name_en,
                code: team.code,
                status: nextStatus,
            });
        },
        onSuccess: (res) => {
            toast.success(res.data?.message || (isArabic ? 'تم تغيير حالة الفريق بنجاح' : 'Team status updated successfully'));
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            refetch();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'حدث خطأ أثناء تعديل الحالة' : 'Error updating status'));
        },
    });

    // 4. Delete Team Mutation
    const deleteTeamMutation = useMutation({
        mutationFn: async (teamId) => axiosInstance.delete(`/admin/teams/${teamId}`),
        onSuccess: (res) => {
            toast.success(res.data?.message || (isArabic ? 'تم حذف الفريق بنجاح' : 'Team deleted successfully'));
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            refetch();
            setDeleteConfirm({ isOpen: false, teamId: null, teamName: '', workersCount: 0 });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'حدث خطأ أثناء الحذف' : 'Error deleting team'));
        },
    });

    const teams = teamsResp?.items || [];
    const meta = teamsResp?.meta || teamsResp?.pagination;
    const lastCountsRef = useRef({ all: 0, active: 0, inactive: 0, total_workers: 0 });
    if (teamsResp?.counts) {
        lastCountsRef.current = teamsResp.counts;
    }
    const counts = teamsResp?.counts || lastCountsRef.current;

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';

    if (isError) {
        return (
            <div className="p-8 text-red-500 font-bold">
                {isArabic ? `حدث خطأ: ${error.message}` : `Error: ${error.message}`}
            </div>
        );
    }

    return (
        <div className="space-y-6 font-main w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'إدارة فرق العمل' : 'Work Teams Management'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic
                            ? 'متابعة وإدارة فرق العمل والعمال الذكور والخدمات التخصصية المسندة'
                            : 'Manage work team profiles, male worker assignments, and specialized services.'}
                    </p>
                </div>
            </div>

            {/* Summary Metric Tab Cards (Matching Workers Layout & Colors) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { key: 'all', statusValue: '', label: isArabic ? 'جميع الفرق' : 'All Teams', icon: '👥', color: 'bg-[#FDF0F3] border-[#fbdbe3]' },
                    { key: 'active', statusValue: 'active', label: isArabic ? 'الفرق النشطة' : 'Active Teams', icon: '✅', color: 'bg-emerald-50 border-emerald-200' },
                    { key: 'inactive', statusValue: 'inactive', label: isArabic ? 'الفرق المعطلة' : 'Inactive Teams', icon: '⏸️', color: 'bg-gray-50 border-gray-200' },
                    { key: 'total_workers', statusValue: 'workers', label: isArabic ? 'عمال الفرق' : 'Team Workers', icon: '👷‍♂️', color: 'bg-purple-50 border-purple-200' },
                ].map((card) => {
                    const isSelected = card.key !== 'total_workers' && filters.status === card.statusValue;
                    return (
                        <button
                            key={card.key}
                            type="button"
                            onClick={() => {
                                if (card.key === 'total_workers') return;
                                setFilters((f) => ({ ...f, status: card.statusValue }));
                                setPage(1);
                            }}
                            className={`p-4 rounded-xl border text-start transition-all flex items-center justify-between outline-none ${
                                isSelected
                                    ? `${card.color} ring-2 ring-[#E91E63]/30 shadow-sm`
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div>
                                <p className="text-xs font-bold text-gray-500">{card.label}</p>
                                <p className="text-2xl font-black text-gray-900 mt-1">{counts[card.key] ?? 0}</p>
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
                            placeholder={isArabic ? 'ابحث باسم الفريق، الرمز...' : 'Search by team name or code...'}
                            className="w-full pr-9 pl-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#E91E63]"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                    </div>

                    {/* Filter drawer button */}
                    <button
                        type="button"
                        onClick={openFilters}
                        className="relative inline-flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 018 17v-3.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        <span>{isArabic ? 'الفلاتر' : 'Filters'}</span>
                        {activeFilterCount > 0 && (
                            <span className="bg-[#E91E63] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {hasPermission('teams.create') && (
                    <button
                        type="button"
                        onClick={() => setActionModal({ isOpen: true, teamToEdit: null })}
                        className="bg-[#E91E63] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#D81B60] transition shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>{isArabic ? 'إضافة فريق عمل جديد' : 'New Work Team'}</span>
                    </button>
                )}
            </div>

            {/* Data Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                <th className="py-3.5 px-4 text-start">{isArabic ? 'كود الفريق' : 'Code'}</th>
                                <th className="py-3.5 px-4 text-start">{isArabic ? 'اسم الفريق' : 'Team Name'}</th>
                                <th className="py-3.5 px-4 text-start">{isArabic ? 'الأعضاء' : 'Members'}</th>
                                <th className="py-3.5 px-4 text-start">{isArabic ? 'الخدمات المسندة' : 'Assigned Services'}</th>
                                <th className="py-3.5 px-4 text-start">{isArabic ? 'الحالة' : 'Status'}</th>
                                <th className="py-3.5 px-4 text-center">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-gray-400">
                                        <div className="flex justify-center items-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                                            </svg>
                                            <span className="font-bold text-gray-500">{isArabic ? 'جاري التحميل...' : 'Loading...'}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : teams.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-gray-400 text-center font-bold">
                                        {isArabic ? 'لم يتم العثور على فرق عمل مطابقة.' : 'No teams found.'}
                                    </td>
                                </tr>
                            ) : (
                                teams.map((team) => (
                                    <tr
                                        key={team.id}
                                        onClick={() => navigate(`/teams/${team.id}`)}
                                        className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                                    >
                                        {/* Code */}
                                        <td className="py-3.5 px-4">
                                            <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-pink-50 text-[#E91E63] border border-pink-100 whitespace-nowrap">
                                                {team.code}
                                            </span>
                                        </td>

                                        {/* Name */}
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-gray-900">
                                                {isArabic ? team.name_ar : team.name_en || team.name_ar}
                                            </div>
                                            <div className="text-[11px] text-gray-400 mt-0.5">
                                                {isArabic ? team.name_en : team.name_ar}
                                            </div>
                                        </td>

                                        {/* Members */}
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md">
                                                    {team.workers_count || 0}
                                                </span>
                                                <div className="flex items-center -space-x-1.5 overflow-hidden">
                                                    {team.workers?.slice(0, 3).map((w) => (
                                                        <div
                                                            key={w.id}
                                                            title={w.name}
                                                            className="w-7 h-7 rounded-full bg-pink-50 border-2 border-white text-[10px] font-bold text-[#E91E63] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs"
                                                        >
                                                            {w.image ? (
                                                                <img src={w.image} alt={w.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                w.name?.charAt(0) || 'W'
                                                            )}
                                                        </div>
                                                    ))}
                                                    {team.workers?.length > 3 && (
                                                        <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white text-[10px] font-bold text-gray-500 flex items-center justify-center">
                                                            +{team.workers.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Assigned Services */}
                                        <td className="py-3.5 px-4">
                                            {team.services?.length === 0 ? (
                                                <span className="text-gray-400 font-medium">—</span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                    {team.services?.map((s) => (
                                                        <span
                                                            key={s.id}
                                                            className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 whitespace-nowrap"
                                                        >
                                                            {isArabic ? s.name_ar : s.name_en || s.name_ar}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="py-3.5 px-4">
                                            <span
                                                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-2xs ${
                                                    team.status === 'active'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                                }`}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        team.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                                                    }`}
                                                ></span>
                                                {team.status === 'active' ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Inactive')}
                                            </span>
                                        </td>

                                        {/* RowActionsMenu */}
                                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <RowActionsMenu
                                                label={isArabic ? 'خيارات' : 'Actions'}
                                                items={[
                                                    {
                                                        key: 'view',
                                                        label: isArabic ? 'عرض التفاصيل' : 'View Details',
                                                        icon: (
                                                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        ),
                                                        onClick: () => navigate(`/teams/${team.id}`),
                                                    },
                                                    hasPermission('teams.edit') && {
                                                        key: 'edit',
                                                        label: isArabic ? 'تعديل' : 'Edit',
                                                        icon: <EditIcon />,
                                                        onClick: () => setActionModal({ isOpen: true, teamToEdit: team }),
                                                    },
                                                    hasPermission('teams.edit') && {
                                                        key: 'toggle',
                                                        label: isArabic ? 'تغيير الحالة' : 'Toggle Status',
                                                        icon: <ToggleIcon />,
                                                        onClick: () => toggleStatusMutation.mutate(team),
                                                        disabled: toggleStatusMutation.isPending,
                                                    },
                                                    hasPermission('teams.delete') && {
                                                        key: 'delete',
                                                        label: isArabic ? 'حذف' : 'Delete',
                                                        icon: <TrashIcon />,
                                                        danger: true,
                                                        onClick: () => {
                                                            setDeleteConfirm({
                                                                isOpen: true,
                                                                teamId: team.id,
                                                                teamName: isArabic ? team.name_ar : team.name_en || team.name_ar,
                                                                workersCount: team.workers_count || 0,
                                                            });
                                                        },
                                                        disabled: deleteTeamMutation.isPending,
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

            {/* Pagination Controls */}
            <Pagination meta={meta} onPageChange={setPage} />

            {/* Filter drawer (slides in matching Workers.jsx) */}
            <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${isFilterOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/40" onClick={() => setIsFilterOpen(false)} />
                <aside
                    className={`absolute top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${
                        isArabic
                            ? `left-0 ${isFilterOpen ? 'translate-x-0' : '-translate-x-full'}`
                            : `right-0 ${isFilterOpen ? 'translate-x-0' : 'translate-x-full'}`
                    }`}
                >
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800">{isArabic ? 'تصفية الفرق' : 'Filter Teams'}</h3>
                        <button onClick={() => setIsFilterOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" aria-label="close">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{isArabic ? 'الحالة' : 'Status'}</label>
                            <select value={draftFilters.status} onChange={(e) => updateDraft('status', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{isArabic ? 'جميع الحالات' : 'All Statuses'}</option>
                                <option value="active">{isArabic ? 'نشط' : 'Active'}</option>
                                <option value="inactive">{isArabic ? 'معطل' : 'Inactive'}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{isArabic ? 'الخدمة التخصصية' : 'Specialized Service'}</label>
                            <select value={draftFilters.service_id} onChange={(e) => updateDraft('service_id', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{isArabic ? 'جميع الخدمات' : 'All Services'}</option>
                                {specializedServices.map((service) => (
                                    <option key={service.id} value={service.id}>
                                        {isArabic ? service.name_ar : service.name_en || service.name_ar}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{isArabic ? 'الترتيب' : 'Sort By'}</label>
                            <select value={`${draftFilters.sort_by}:${draftFilters.sort_dir}`} onChange={(e) => handleSortChange(e.target.value)} className={`${selectClass} w-full`}>
                                <option value="created_at:desc">{isArabic ? 'الأحدث أولاً' : 'Newest'}</option>
                                <option value="created_at:asc">{isArabic ? 'الأقدم أولاً' : 'Oldest'}</option>
                                <option value="name_ar:asc">{isArabic ? 'الاسم (أ - ي)' : 'Name (A - Z)'}</option>
                                <option value="code:asc">{isArabic ? 'رمز الفريق' : 'Team Code'}</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 flex items-center gap-3">
                        <button
                            onClick={resetFilters}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                        >
                            {isArabic ? 'إعادة ضبط' : 'Reset'}
                        </button>
                        <button
                            onClick={applyFilters}
                            className="flex-1 px-4 py-2 bg-[#E91E63] text-white rounded-lg hover:bg-[#D81B60] font-medium transition-colors"
                        >
                            {isArabic ? 'تطبيق' : 'Apply'}
                        </button>
                    </div>
                </aside>
            </div>

            {/* Action Modal (Full screen page modal like WorkerActionModal) */}
            {actionModal.isOpen && (
                <TeamActionModal
                    isOpen={actionModal.isOpen}
                    teamToEdit={actionModal.teamToEdit}
                    onClose={() => setActionModal({ isOpen: false, teamToEdit: null })}
                    onSuccess={() => refetch()}
                />
            )}

            {/* Details Modal */}
            {detailsModal.isOpen && (
                <TeamDetailsModal
                    isOpen={detailsModal.isOpen}
                    teamId={detailsModal.teamId}
                    onClose={() => setDetailsModal({ isOpen: false, teamId: null })}
                />
            )}

            {/* Delete Confirmation Modal (Matching Workers.jsx Delete Modal) */}
            {deleteConfirm.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                        onClick={() => setDeleteConfirm({ isOpen: false, teamId: null, teamName: '', workersCount: 0 })}
                    />

                    {/* Modal Content */}
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full relative z-10 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mx-auto mb-4">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>

                        <h3 className="text-lg font-bold text-gray-800 text-center mb-2">
                            {isArabic ? 'تأكيد حذف فريق العمل' : 'Confirm Team Deletion'}
                        </h3>
                        <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
                            {isArabic
                                ? `هل أنت متأكد من رغبتك في حذف فريق العمل "${deleteConfirm.teamName}"؟ سيتم فك ارتباط ${deleteConfirm.workersCount} عامل(عمال) تلقائياً دون حذف حساباتهم.`
                                : `Are you sure you want to delete team "${deleteConfirm.teamName}"? ${deleteConfirm.workersCount} worker(s) will be unassigned automatically.`}
                        </p>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setDeleteConfirm({ isOpen: false, teamId: null, teamName: '', workersCount: 0 })}
                                className="px-5 py-2.5 rounded-full border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
                            >
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                onClick={() => {
                                    deleteTeamMutation.mutate(deleteConfirm.teamId);
                                }}
                                disabled={deleteTeamMutation.isPending}
                                className="px-5 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-colors text-sm flex items-center gap-2"
                            >
                                {deleteTeamMutation.isPending && (
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                )}
                                {isArabic ? 'تأكيد الحذف' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
