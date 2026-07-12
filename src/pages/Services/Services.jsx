import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

// استدعاء نافذة الإضافة والتعديل
import ServiceActionModal from './ServiceActionModal';
import ServiceDetailsModal from './ServiceDetailsModal';
import RowActionsMenu, { EditIcon, ToggleIcon } from '../../component/RowActionsMenu.jsx';
import TagList from '../../component/TagList.jsx';
import Pagination from '../../component/Pagination.jsx';
import usePagedList from '../../hooks/usePagedList.js';

const DEFAULT_FILTERS = {
    status: '',
    type: '',
    category_id: '',
    min_rating: '',
    sort_by: 'created_at',
    sort_dir: 'desc',
};

export default function Services() {
    const { t, i18n } = useTranslation('services');
    const queryClient = useQueryClient();
    const currentLang = i18n.language;
    const isArabic = currentLang?.startsWith('ar');

    // حالة للتحكم بفتح وإغلاق نافذة الإضافة/التعديل
    const [actionModal, setActionModal] = useState({ isOpen: false, serviceToEdit: null });
    const [detailsId, setDetailsId] = useState(null);
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

    const applyFilters = () => {
        setFilters(draftFilters);
        setIsFilterOpen(false);
    };

    const resetFilters = () => {
        setSearchInput('');
        setSearch('');
        setFilters(DEFAULT_FILTERS);
        setDraftFilters(DEFAULT_FILTERS);
    };

    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== '' && value != null) params.append(key, value);
        });
        return params.toString();
    }, [search, filters]);

    // The "Name (A–Z)" sort targets the column for the current UI language.
    const nameSortValue = `${isArabic ? 'name_ar' : 'name_en'}:asc`;

    // Drawer filters that are active (search lives in the header, counted separately).
    const activeFilterCount =
        (filters.status ? 1 : 0) +
        (filters.type ? 1 : 0) +
        (filters.category_id ? 1 : 0) +
        (filters.min_rating ? 1 : 0) +
        (filters.sort_by !== DEFAULT_FILTERS.sort_by || filters.sort_dir !== DEFAULT_FILTERS.sort_dir ? 1 : 0);

    // 1. جلب قائمة الخدمات مع الفلاتر والبحث
    const { data: services = [], isLoading, isError, error } = useQuery({
        queryKey: ['services', queryString],
        queryFn: async () => {
            const response = await axiosInstance.get(`/admin/services?${queryString}`);
            return response.data.data.items || [];
        },
        keepPreviousData: true,
    });

    // Paginate the fetched services client-side (the API returns the full list).
    const { items: pagedServices, meta, setPage } = usePagedList(services, 10, queryString);

    // 2. جلب قائمة الأقسام (Categories) للـ Modal وفلتر القسم
    const { data: categories = [] } = useQuery({
        queryKey: ['categoriesList'],
        queryFn: async () => {
            const response = await axiosInstance.get('/admin/categories');
            return response.data.data.items || [];
        },
    });

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';
    const categoryLabel = (cat) => (isArabic ? cat.name_ar : cat.name_en);

    // 3. عملية تغيير حالة الخدمة (Toggle Status)
    const toggleStatusMutation = useMutation({
        mutationFn: (serviceId) => {
            return axiosInstance.post(`/admin/services/${serviceId}/toggle-status`);
        },
        onSuccess: (response) => {
            toast.success(response.data.message || "تم تغيير حالة الخدمة بنجاح");
            queryClient.invalidateQueries({ queryKey: ['services'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "حدث خطأ أثناء تغيير الحالة.");
            console.error("Toggle status error:", error);
        }
    });

    // دالة مساعدة لاختيار لون شارة (Badge) نوع الخدمة
    const getTypeBadgeStyles = (type) => {
        switch (type) {
            case 'hourly': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'moqema': return 'bg-purple-50 text-purple-600 border-purple-200';
            case 'both': return 'bg-teal-50 text-teal-600 border-teal-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    if (isError) return <div className="p-8 text-red-500 font-bold">حدث خطأ: {error.message}</div>;

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

                    {/* Filter button (opens the left drawer) */}
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
                    {false && (
                        <button
                            onClick={() => setActionModal({ isOpen: true, serviceToEdit: null })}
                            className="bg-[#E91E63] text-white px-5 py-2 rounded-full font-medium hover:bg-[#D81B60] transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            {t('add_new')}
                        </button>
                    )}
                </div>
            </div>

            {/* حاوية الجدول (Responsive Horizontal Scroll) */}
            <div className="overflow-x-auto w-full">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500 min-w-[960px]">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-4 w-16 text-center">{t('table.image')}</th>
                            <th className="px-4 py-4">{t('table.name')}</th>
                            <th className="px-4 py-4">{t('table.base_price')}</th>
                            <th className="px-4 py-4 text-center">{t('table.type')}</th>
                            <th className="px-4 py-4 text-center">{t('table.rating')}</th>
                            <th className="px-4 py-4 text-center">{t('table.status')}</th>
                            <th className="px-4 py-4 text-center">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-3">
                                        <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                                        </svg>
                                        <span className="text-lg font-medium">{t('loading')}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : services.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-10 text-center text-gray-500">{t('no_data')}</td>
                            </tr>
                        ) : (
                            pagedServices.map((service) => (
                                <tr key={service.id} onClick={() => setDetailsId(service.id)} className="border-b transition-colors hover:bg-gray-50 bg-white cursor-pointer">
                                    
                                    {/* 1. الصورة */}
                                    <td className="px-4 py-3">
                                        <div className="w-12 h-12 mx-auto rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                                            {service.image ? (
                                                <img src={service.image} alt={service.name_en} className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </div>
                                    </td>

                                    {/* 2. اسم الخدمة */}
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-gray-800 line-clamp-1">
                                            {currentLang === 'ar' ? service.name_ar : service.name_en}
                                        </p>
                                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                                            {currentLang === 'ar' ? service.description_ar : service.description_en}
                                        </p>
                                    </td>

                                    {/* السعر الأساسي */}
                                    <td className="px-4 py-3">
                                        <span className="font-semibold text-gray-700 whitespace-nowrap">
                                            {service.base_price} {service.price_details?.currency || 'EGP'}
                                        </span>
                                    </td>

                                    {/* 4. نوع الخدمة */}
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getTypeBadgeStyles(service.type)}`}>
                                            {t(`types.${service.type}`)}
                                        </span>
                                    </td>

                                    {/* 5. التقييم */}
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1 text-yellow-500 font-bold">
                                            <span>{service.avg_rating}</span>
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        </div>
                                    </td>

                                    {/* 6. الحالة */}
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                            service.status === 'active' 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {service.status === 'active' ? t('status.active') : t('status.inactive')}
                                        </span>
                                    </td>

                                    {/* 7. الإجراءات */}
                                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <RowActionsMenu
                                            label={t('table.actions')}
                                            items={[
                                                {
                                                    key: 'edit',
                                                    label: t('actions.edit'),
                                                    icon: <EditIcon />,
                                                    onClick: () => setActionModal({ isOpen: true, serviceToEdit: service }),
                                                },
                                                {
                                                    key: 'toggle',
                                                    label: t('actions.toggle_status'),
                                                    icon: <ToggleIcon />,
                                                    onClick: () => toggleStatusMutation.mutate(service.id),
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
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.type_label')}</label>
                            <select value={draftFilters.type} onChange={(e) => updateDraft('type', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.all_types')}</option>
                                <option value="hourly">{t('types.hourly')}</option>
                                <option value="moqema">{t('types.moqema')}</option>
                                <option value="both">{t('types.both')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.category_label')}</label>
                            <select value={draftFilters.category_id} onChange={(e) => updateDraft('category_id', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.all_categories')}</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{categoryLabel(cat)}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.rating_label')}</label>
                            <select value={draftFilters.min_rating} onChange={(e) => updateDraft('min_rating', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.any_rating')}</option>
                                <option value="3">3+</option>
                                <option value="4">4+</option>
                                <option value="4.5">4.5+</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.sort_label')}</label>
                            <select value={`${draftFilters.sort_by}:${draftFilters.sort_dir}`} onChange={(e) => handleSortChange(e.target.value)} className={`${selectClass} w-full`}>
                                <option value="created_at:desc">{t('filters.sort_newest')}</option>
                                <option value="created_at:asc">{t('filters.sort_oldest')}</option>
                                <option value="avg_rating:desc">{t('filters.sort_top_rated')}</option>
                                <option value={nameSortValue}>{t('filters.sort_name')}</option>
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

            {/* نافذة الإضافة والتعديل */}
            {actionModal.isOpen && (
                <ServiceActionModal
                    serviceToEdit={actionModal.serviceToEdit}
                    categories={categories || []}
                    onClose={() => setActionModal({ isOpen: false, serviceToEdit: null })}
                />
            )}

            {/* نافذة تفاصيل الخدمة */}
            {detailsId && (
                <ServiceDetailsModal serviceId={detailsId} onClose={() => setDetailsId(null)} />
            )}

        </div>
    );
}