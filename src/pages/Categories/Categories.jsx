import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import RowActionsMenu, { EditIcon, ToggleIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';
import usePagedList from '../../hooks/usePagedList.js';

// استدعاء النوافذ المنبثقة
import CategoryActionModal from './CategoryActionModal';

const DEFAULT_FILTERS = { status: '', type: '', sort_by: 'sort_order', sort_dir: 'asc' };

export default function Category() {
    const { t, i18n } = useTranslation('categories');
    const queryClient = useQueryClient();
    const currentLang = i18n.language;
    const isArabic = currentLang?.startsWith('ar');

    const [actionModal, setActionModal] = useState({ isOpen: false, categoryToEdit: null });
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');              // committed search (applies live)
    const [filters, setFilters] = useState(DEFAULT_FILTERS); // committed drawer filters
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS); // staged until "Apply"
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Debounce the free-text search before it hits the API.
    useEffect(() => {
        const id = setTimeout(() => setSearch(searchInput), 400);
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
    const applyFilters = () => { setFilters(draftFilters); setIsFilterOpen(false); };
    const resetFilters = () => {
        setSearchInput('');
        setSearch('');
        setFilters(DEFAULT_FILTERS);
        setDraftFilters(DEFAULT_FILTERS);
    };

    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        Object.entries(filters).forEach(([key, value]) => { if (value !== '' && value != null) params.append(key, value); });
        return params.toString();
    }, [search, filters]);

    const isFiltering = !!(search || filters.status || filters.type);
    const nameSortValue = `${isArabic ? 'name_ar' : 'name_en'}:asc`;

    const activeFilterCount =
        (filters.status ? 1 : 0) +
        (filters.type ? 1 : 0) +
        (filters.sort_by !== DEFAULT_FILTERS.sort_by || filters.sort_dir !== DEFAULT_FILTERS.sort_dir ? 1 : 0);

    // Listing data (reacts to filters).
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['categories', queryString],
        queryFn: async () => (await axiosInstance.get(`/admin/categories?${queryString}`)).data.data.items || [],
        keepPreviousData: true,
    });

    // Main categories for the modal's parent dropdown — fetched independently so
    // it stays complete regardless of the listing filters.
    const { data: mainCategories = [], refetch: refetchMainCategories } = useQuery({
        queryKey: ['main-categories'],
        queryFn: async () => (await axiosInstance.get('/admin/categories?type=main')).data.data.items || [],
    });

    // When no filter is active, group parents with their children; while
    // filtering, show a flat result list (a matching child may have no matching parent).
    const structuredCategories = useMemo(() => {
        if (!data) return [];
        const parents = data.filter((item) => item.parent === null);
        const result = [];
        parents.forEach((parent) => {
            result.push({ ...parent, isMain: true });
            data.filter((item) => item.parent?.id === parent.id).forEach((child) => {
                result.push({ ...child, isMain: false });
            });
        });
        return result;
    }, [data]);

    const rows = isFiltering ? (data || []).map((c) => ({ ...c, isMain: c.parent === null })) : structuredCategories;

    // Paginate the rendered rows client-side (the API returns the full tree).
    const { items: pagedRows, meta, setPage } = usePagedList(rows, 10, queryString);

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';

    // Toggle a category's active/inactive status.
    const toggleStatusMutation = useMutation({
        mutationFn: (categoryId) => axiosInstance.post(`/admin/categories/${categoryId}/toggle-status`),
        onSuccess: (response) => {
            toast.success(response.data.message || t('toggle_success', { defaultValue: 'Status updated successfully' }));
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['main-categories'] });
            refetch();
            refetchMainCategories();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || t('toggle_error', { defaultValue: 'Failed to update status' }));
        },
    });

    if (isError) {
        return <div className="p-8 text-red-500 font-bold">حدث خطأ: {error.message}</div>;
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">

            {/* الترويسة والبحث والفلاتر وزر الإضافة */}
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

                    {/* Add new */}
                    <button
                        onClick={() => setActionModal({ isOpen: true, categoryToEdit: null })}
                        className="bg-[#E91E63] text-white px-5 py-2 rounded-full font-medium hover:bg-[#D81B60] transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {t('add_new')}
                    </button>
                </div>
            </div>

            {/* الجدول */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 w-16">{t('table.image')}</th>
                            <th className="px-6 py-4">{t('table.name')}</th>
                            <th className="px-6 py-4">{t('table.type')}</th>
                            <th className="px-6 py-4 text-center">{t('table.status')}</th>
                            <th className="px-6 py-4 text-center">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-3">
                                        <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                                        </svg>
                                        <span className="text-lg font-medium">{t('loading')}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">{t('no_data')}</td>
                            </tr>
                        ) : (
                            pagedRows.map((category) => (
                                <tr
                                    key={category.id}
                                    className={`border-b transition-colors hover:bg-gray-50 ${category.isMain ? 'bg-gray-50/30' : 'bg-white'}`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                                            {category.image ? (
                                                <img src={category.image} alt={category.name_en} className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`flex items-center gap-2 ${category.isMain ? 'font-bold text-gray-800' : 'rtl:pr-6 ltr:pl-6 text-gray-600'}`}>
                                            {!category.isMain && (
                                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            )}
                                            {currentLang === 'ar' ? category.name_ar : category.name_en}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${category.isMain ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {category.isMain ? t('types.main') : t('types.sub')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${category.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {category.status === 'active' ? t('status.active') : t('status.inactive')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <RowActionsMenu
                                            label={t('table.actions')}
                                            items={[
                                                {
                                                    key: 'edit',
                                                    label: t('actions.edit', { defaultValue: 'Edit' }),
                                                    icon: <EditIcon />,
                                                    onClick: () => setActionModal({ isOpen: true, categoryToEdit: category }),
                                                },
                                                {
                                                    key: 'toggle',
                                                    label: t('actions.toggle_status', { defaultValue: 'Toggle Status' }),
                                                    icon: <ToggleIcon />,
                                                    onClick: () => toggleStatusMutation.mutate(category.id),
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
            <Pagination meta={meta} onPageChange={setPage} />

            {/* Filter drawer (slides in from the right) */}
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
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.status_label')}</label>
                            <select value={draftFilters.status} onChange={(e) => updateDraft('status', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.all_statuses')}</option>
                                <option value="active">{t('status.active')}</option>
                                <option value="inactive">{t('status.inactive')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.type_label')}</label>
                            <select value={draftFilters.type} onChange={(e) => updateDraft('type', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.all_types')}</option>
                                <option value="main">{t('types.main')}</option>
                                <option value="sub">{t('types.sub')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.sort_label')}</label>
                            <select value={`${draftFilters.sort_by}:${draftFilters.sort_dir}`} onChange={(e) => handleSortChange(e.target.value)} className={`${selectClass} w-full`}>
                                <option value="sort_order:asc">{t('filters.sort_default')}</option>
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

            {/* تشغيل النوافذ المنبثقة بناءً على الـ State */}
            {actionModal.isOpen && (
                <CategoryActionModal
                    categoryToEdit={actionModal.categoryToEdit}
                    mainCategories={mainCategories}
                    onClose={() => setActionModal({ isOpen: false, categoryToEdit: null })}
                    onSuccess={() => {
                        refetch();
                        refetchMainCategories();
                    }}
                />
            )}

        </div>
    );
}
