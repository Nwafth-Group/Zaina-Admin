import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import BannerActionModal from './BannerActionModal';
import RowActionsMenu, { EditIcon, ToggleIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';

const DEFAULT_FILTERS = {
    status: '',
    sort_by: 'created_at',
    sort_dir: 'desc',
    per_page: 15,
};

export default function Banners() {
    const { t, i18n } = useTranslation('banners');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [actionModal, setActionModal] = useState({ isOpen: false, bannerToEdit: null });

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
            toast.success(response.data?.message || "تم حذف الإعلان بنجاح");
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

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col min-h-[70vh]">
            
            {/* Header / Toolbar */}
            <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('title')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
                </div>

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

                    {/* Add new */}
                    <button
                        onClick={() => setActionModal({ isOpen: true, bannerToEdit: null })}
                        className="bg-[#E91E63] text-white px-5 py-2 rounded-full font-medium hover:bg-[#D81B60] transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {t('add_new')}
                    </button>
                </div>
            </div>

            {/* Table / Listing view */}
            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-start border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider">
                            <th className="px-4 md:px-6 py-4 text-start w-20">{t('table.image')}</th>
                            <th className="px-4 py-4 text-start">{t('table.title')}</th>
                            <th className="px-4 py-4 text-start w-32">{t('table.status')}</th>
                            <th className="px-4 py-4 text-center w-24">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
                        {isLoading ? (
                            <tr>
                                <td colSpan="4" className="py-16 text-center text-gray-500 font-medium">
                                    <div className="flex justify-center items-center gap-3">
                                        <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                        <span>{t('loading')}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : banners.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="py-16 text-center text-gray-400 font-medium">
                                    {t('no_data')}
                                </td>
                            </tr>
                        ) : (
                            banners.map((banner) => {
                                const title = isAr ? banner.title_ar : banner.title_en;
                                return (
                                    <tr key={banner.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 md:px-6 py-3.5">
                                            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-100 flex items-center justify-center shrink-0">
                                                {banner.image ? (
                                                    <img src={banner.image} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 font-semibold text-gray-800">
                                            {title || <span className="text-gray-400 font-normal">--</span>}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${banner.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${banner.status === 'active' ? 'bg-green-600' : 'bg-gray-400'}`} />
                                                {banner.status === 'active' ? t('status.active') : t('status.inactive')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <RowActionsMenu
                                                label={t('actions.title')}
                                                items={[
                                                    {
                                                        key: 'edit',
                                                        label: t('actions.edit'),
                                                        icon: <EditIcon />,
                                                        onClick: () => setActionModal({ isOpen: true, bannerToEdit: banner }),
                                                    },
                                                    {
                                                        key: 'toggle',
                                                        label: t('actions.toggle_status'),
                                                        icon: <ToggleIcon />,
                                                        onClick: () => toggleStatusMutation.mutate(banner.id),
                                                        disabled: toggleStatusMutation.isPending,
                                                    },
                                                    {
                                                        key: 'delete',
                                                        label: t('actions.delete', { defaultValue: 'حذف' }),
                                                        danger: true,
                                                        icon: (
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        ),
                                                        onClick: () => {
                                                            if (window.confirm("هل أنت متأكد من حذف هذا الإعلان؟")) {
                                                                deleteMutation.mutate(banner.id);
                                                            }
                                                        },
                                                        disabled: deleteMutation.isPending,
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

            {/* Pagination / Page Size controls */}
            <div className="p-4 md:p-6 border-t border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <Pagination meta={meta} onPageChange={setPage} />
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{t('pagination.rows_per_page', { defaultValue: 'عدد الأسطر:' })}</span>
                    <select
                        value={filters.per_page}
                        onChange={(e) => {
                            setFilters(f => ({ ...f, per_page: Number(e.target.value) }));
                            setPage(1);
                        }}
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                    >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
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

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.status_label')}</label>
                            <select value={draftFilters.status} onChange={(e) => updateDraft('status', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.all_statuses')}</option>
                                <option value="active">{t('status.active')}</option>
                                <option value="inactive">{t('status.inactive')}</option>
                            </select>
                        </div>



                        {/* Sort Order */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.sort_label')}</label>
                            <select value={`${draftFilters.sort_by}:${draftFilters.sort_dir}`} onChange={(e) => handleSortChange(e.target.value)} className={`${selectClass} w-full`}>
                                <option value="created_at:desc">{t('filters.sort_newest')}</option>
                                <option value="created_at:asc">{t('filters.sort_oldest')}</option>
                                <option value="status:asc">الحالة تصاعدياً</option>
                                <option value="status:desc">الحالة تنازلياً</option>
                            </select>
                        </div>
                    </div>

                    {/* Drawer Footer Actions */}
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

            {actionModal.isOpen && (
                <BannerActionModal
                    bannerToEdit={actionModal.bannerToEdit}
                    onClose={() => setActionModal({ isOpen: false, bannerToEdit: null })}
                />
            )}
        </div>
    );
}
