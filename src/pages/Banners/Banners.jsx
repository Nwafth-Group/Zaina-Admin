import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import RowActionsMenu, { EyeIcon, EditIcon, ToggleIcon, TrashIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';
import { hasPermission } from '../../utils/permissions.js';

const DEFAULT_FILTERS = {
    status: '',
    sort_by: 'created_at',
    sort_dir: 'desc',
    per_page: 15,
};

export default function Banners() {
    const { t, i18n } = useTranslation('banners');
    const navigate = useNavigate();
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const lastCountsRef = useRef({ all: 0, active: 0, inactive: 0 });

    // Debounce search
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
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.append('search', search);
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== '' && value != null) params.append(key, value);
        });
        return params.toString();
    }, [page, search, filters]);

    const activeFilterCount =
        (filters.status ? 1 : 0) +
        (filters.sort_by !== DEFAULT_FILTERS.sort_by || filters.sort_dir !== DEFAULT_FILTERS.sort_dir ? 1 : 0);

    const { data: paginatedData, isLoading, isError, error } = useQuery({
        queryKey: ['banners', queryString],
        queryFn: async () => (await axiosInstance.get(`/admin/ads?${queryString}`)).data.data,
        keepPreviousData: true,
    });

    const banners = paginatedData?.items || [];
    const meta = paginatedData?.meta;

    if (paginatedData?.counts) {
        lastCountsRef.current = paginatedData.counts;
    }
    const counts = lastCountsRef.current;

    const toggleStatusMutation = useMutation({
        mutationFn: (id) => axiosInstance.patch(`/admin/ads/${id}/toggle-status`),
        onSuccess: (response) => {
            toast.success(response.data?.message || t('toggled'));
            queryClient.invalidateQueries({ queryKey: ['banners'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || t('error'));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => axiosInstance.delete(`/admin/ads/${id}`),
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم حذف الإعلان بنجاح' : 'Banner deleted successfully'));
            queryClient.invalidateQueries({ queryKey: ['banners'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || t('error'));
        },
    });

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';

    if (isError) return <div className="p-8 text-red-500 font-bold">{error.message}</div>;

    const isAr = i18n.language === 'ar';

    const cardTabs = [
        { key: '', label: isArabic ? 'جميع الإعلانات' : 'All Banners', count: counts.all, icon: '🖼️', color: 'bg-[#FDF0F3] border-[#fbdbe3]' },
        { key: 'active', label: isArabic ? 'الإعلانات النشطة' : 'Active Banners', count: counts.active, icon: '✅', color: 'bg-emerald-50 border-emerald-200' },
        { key: 'inactive', label: isArabic ? 'الإعلانات المعطلة' : 'Inactive Banners', count: counts.inactive, icon: '⏸️', color: 'bg-gray-50 border-gray-200' },
    ];

    return (
        <div className="space-y-6 font-main w-full">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'إدارة الإعلانات البنريّة' : 'Banners Management'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'إدارة وتخصيص البنرات الإعلانية في التطبيق.' : 'Manage and customize promotional banners across the app.'}
                    </p>
                </div>

                <button
                    onClick={() => navigate('/banners/create')}
                    className="bg-[#E91E63] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#D81B60] transition shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto outline-none"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{t('add_new')}</span>
                </button>
            </div>

            {/* Metric Tabs Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {cardTabs.map((card) => {
                    const isActive = filters.status === card.key;
                    return (
                        <button
                            key={card.key}
                            onClick={() => {
                                setFilters((f) => ({ ...f, status: card.key }));
                                setPage(1);
                            }}
                            className={`p-4 rounded-xl border text-start transition-all flex items-center justify-between ${
                                isActive ? `${card.color} ring-2 ring-[#E91E63]/30 shadow-sm` : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div>
                                <p className="text-xs font-bold text-gray-500">{card.label}</p>
                                <p className="text-2xl font-black text-gray-900 mt-1">{card.count ?? 0}</p>
                            </div>
                            <div className="text-2xl">{card.icon}</div>
                        </button>
                    );
                })}
            </div>

            {/* Filter & Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
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
                        className="w-full border border-gray-200 rounded-lg ps-9 pe-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button
                        onClick={openFilters}
                        className="relative inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-3.5 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <span>{t('filters.button')}</span>
                        {activeFilterCount > 0 && (
                            <span className="bg-[#E91E63] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">
                                <th className="py-3.5 px-4 text-center">{t('table.image')}</th>
                                <th className="py-3.5 px-4 text-center">{t('table.title')}</th>
                                <th className="py-3.5 px-4 text-center">{t('table.status')}</th>
                                <th className="py-3.5 px-4 text-center">{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" className="py-12 text-center text-gray-400">
                                        <div className="flex justify-center items-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                            <span className="font-bold text-gray-500">{t('loading')}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : banners.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-12 text-center text-gray-400 font-bold">
                                        {t('no_data')}
                                    </td>
                                </tr>
                            ) : (
                                banners.map((banner) => {
                                    const title = isAr ? banner.title_ar : banner.title_en;
                                    return (
                                        <tr key={banner.id} onClick={() => navigate(`/banners/${banner.id}`)} className="hover:bg-gray-50/80 transition-colors cursor-pointer">
                                            <td className="py-3 px-4 text-center">
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center mx-auto shrink-0">
                                                    {banner.image ? (
                                                        <img src={banner.image} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-start font-bold text-gray-900">
                                                {title || <span className="text-gray-400 font-normal">--</span>}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${
                                                    banner.status === 'active'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${banner.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                                    {banner.status === 'active' ? t('status.active') : t('status.inactive')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-center">
                                                    <RowActionsMenu
                                                        label={t('actions.title')}
                                                        items={[
                                                            {
                                                                key: 'details',
                                                                label: isArabic ? 'التفاصيل' : 'View Details',
                                                                icon: <EyeIcon />,
                                                                onClick: () => navigate(`/banners/${banner.id}`),
                                                            },
                                                            hasPermission('banners.edit') && {
                                                                key: 'edit',
                                                                label: t('actions.edit'),
                                                                icon: <EditIcon />,
                                                                onClick: () => navigate(`/banners/${banner.id}/edit`),
                                                            },
                                                            hasPermission('banners.edit') && {
                                                                key: 'toggle',
                                                                label: t('actions.toggle_status'),
                                                                icon: <ToggleIcon />,
                                                                onClick: () => toggleStatusMutation.mutate(banner.id),
                                                                disabled: toggleStatusMutation.isPending,
                                                            },
                                                            hasPermission('banners.delete') && {
                                                                key: 'delete',
                                                                label: t('actions.delete', { defaultValue: 'حذف' }),
                                                                danger: true,
                                                                icon: <TrashIcon />,
                                                                onClick: () => {
                                                                    if (window.confirm("هل أنت متأكد من حذف هذا الإعلان؟")) {
                                                                        deleteMutation.mutate(banner.id);
                                                                    }
                                                                },
                                                                disabled: deleteMutation.isPending,
                                                            },
                                                        ].filter(Boolean)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-3.5 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <Pagination meta={meta} onPageChange={setPage} />
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{t('pagination.rows_per_page', { defaultValue: 'عدد الأسطر:' })}</span>
                        <select
                            value={filters.per_page}
                            onChange={(e) => {
                                setFilters(f => ({ ...f, per_page: Number(e.target.value) }));
                                setPage(1);
                            }}
                            className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 bg-white focus:ring-1 focus:ring-[#E91E63] outline-none"
                        >
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Filter Drawer */}
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

                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{t('filters.status')}</label>
                            <select
                                value={draftFilters.status}
                                onChange={(e) => updateDraft('status', e.target.value)}
                                className={`${selectClass} w-full`}
                            >
                                <option value="">{t('filters.all_statuses')}</option>
                                <option value="active">{t('status.active')}</option>
                                <option value="inactive">{t('status.inactive')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{t('filters.sort_by')}</label>
                            <select
                                value={`${draftFilters.sort_by}:${draftFilters.sort_dir}`}
                                onChange={(e) => handleSortChange(e.target.value)}
                                className={`${selectClass} w-full`}
                            >
                                <option value="created_at:desc">{t('sort.newest')}</option>
                                <option value="created_at:asc">{t('sort.oldest')}</option>
                                <option value="status:asc">{t('sort.status_asc')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 flex gap-2">
                        <button onClick={resetFilters} className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                            {t('filters.reset')}
                        </button>
                        <button onClick={applyFilters} className="flex-1 py-2 text-xs font-bold text-white bg-[#E91E63] rounded-lg hover:bg-[#D81B60] transition">
                            {t('filters.apply')}
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}
