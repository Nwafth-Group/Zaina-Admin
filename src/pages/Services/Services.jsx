import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
    sort_by: 'created_at',
    sort_dir: 'desc',
};

export default function Services() {
    const navigate = useNavigate();
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
        (filters.type ? 1 : 0);

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
    const activeCount = useMemo(() => services.filter((s) => s.status === 'active').length, [services]);
    const inactiveCount = useMemo(() => services.filter((s) => s.status !== 'active').length, [services]);
    const hourlyCount = useMemo(() => services.filter((s) => s.type === 'hourly').length, [services]);

    if (isError) return <div className="p-8 text-red-500 font-bold">حدث خطأ: {error.message}</div>;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900">
                        {isArabic ? 'إدارة الخدمات' : 'Services Management'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'إدارة وتعديل الخدمات وتأكيدات التغطية وتخصيص العمالة في النظام' : 'Manage services, pricing rules, coverage areas, and worker assignments.'}
                    </p>
                </div>
            </div>

            {/* Summary Metric Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                    type="button"
                    onClick={() => { setFilters((f) => ({ ...f, status: '', type: '' })); }}
                    className={`p-4 rounded-xl border text-right transition flex items-center justify-between ${!filters.status && !filters.type ? 'bg-[#E91E63] text-white border-[#E91E63] shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                    <div>
                        <p className={`text-xs font-bold ${!filters.status && !filters.type ? 'text-white/80' : 'text-gray-400'}`}>
                            {isArabic ? 'جميع الخدمات' : 'All Services'}
                        </p>
                        <p className="text-2xl font-black mt-1">{services.length}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${!filters.status && !filters.type ? 'bg-white/20 text-white' : 'bg-pink-50 text-[#E91E63]'}`}>
                        ✨
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => { setFilters((f) => ({ ...f, status: 'active', type: '' })); }}
                    className={`p-4 rounded-xl border text-right transition flex items-center justify-between ${filters.status === 'active' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                    <div>
                        <p className={`text-xs font-bold ${filters.status === 'active' ? 'text-emerald-100' : 'text-gray-400'}`}>
                            {isArabic ? 'الخدمات النشطة' : 'Active Services'}
                        </p>
                        <p className="text-2xl font-black mt-1">{activeCount}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${filters.status === 'active' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                        ✅
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => { setFilters((f) => ({ ...f, status: 'inactive', type: '' })); }}
                    className={`p-4 rounded-xl border text-right transition flex items-center justify-between ${filters.status === 'inactive' ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                    <div>
                        <p className={`text-xs font-bold ${filters.status === 'inactive' ? 'text-rose-100' : 'text-gray-400'}`}>
                            {isArabic ? 'غير النشطة' : 'Inactive Services'}
                        </p>
                        <p className="text-2xl font-black mt-1">{inactiveCount}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${filters.status === 'inactive' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'}`}>
                        🔒
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => { setFilters((f) => ({ ...f, status: '', type: 'hourly' })); }}
                    className={`p-4 rounded-xl border text-right transition flex items-center justify-between ${filters.type === 'hourly' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                    <div>
                        <p className={`text-xs font-bold ${filters.type === 'hourly' ? 'text-blue-100' : 'text-gray-400'}`}>
                            {isArabic ? 'خدمات بالساعة' : 'Hourly Services'}
                        </p>
                        <p className="text-2xl font-black mt-1">{hourlyCount}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${filters.type === 'hourly' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
                        ⏱️
                    </div>
                </button>
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
                            placeholder={t('filters.search_placeholder')}
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
                        <span>{t('filters.button')}</span>
                        {activeFilterCount > 0 && (
                            <span className="bg-[#E91E63] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Grid of Service Cards */}
            <div>
                {isLoading ? (
                    <div className="flex justify-center items-center py-20 gap-3">
                        <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                        </svg>
                        <span className="text-sm font-bold text-gray-500">{t('loading')}</span>
                    </div>
                ) : services.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                        {t('no_data')}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pagedServices.map((service) => {
                            const assignedWorkers = service.workers || service.preferred_workers || [];
                            return (
                                <div
                                    key={service.id}
                                    onClick={() => navigate(`/services/${service.id}`)}
                                    className="bg-white rounded-3xl border border-gray-100 shadow-2xs overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer group"
                                >
                                    {/* Image & Status Badge */}
                                    <div className="relative h-48 w-full bg-gray-50 flex items-center justify-center overflow-hidden border-b border-gray-100">
                                        {service.image ? (
                                            <img
                                                src={service.image}
                                                alt={service.name_en}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center text-[#E91E63]">
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Status Badge */}
                                        <div className="absolute top-3 ltr:left-3 rtl:right-3 z-10">
                                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-2xs ${
                                                service.status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${service.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                {service.status === 'active' ? t('status.active') : t('status.inactive')}
                                            </span>
                                        </div>

                                        {/* Actions Menu */}
                                        <div className="absolute top-3 ltr:right-3 rtl:left-3 z-10" onClick={(e) => e.stopPropagation()}>
                                            <div className="bg-white/90 backdrop-blur p-1 rounded-full shadow-2xs hover:bg-white transition-all">
                                                <RowActionsMenu
                                                    label=""
                                                    items={[
                                                        {
                                                            key: 'view',
                                                            label: isArabic ? 'عرض التفاصيل' : 'View Details',
                                                            icon: <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 123c.86-3.897 4.37-6.8 8.464-6.8 4.093 0 7.604 2.903 8.464 6.8-.86 3.897-4.37 6.8-8.464 6.8-4.093 0-7.604-2.903-8.464-6.8zM12 15a3 3 0 100-6 3 3 0 000 6z" /></svg>,
                                                            onClick: () => navigate(`/services/${service.id}`),
                                                        },
                                                        {
                                                            key: 'edit',
                                                            label: t('actions.edit'),
                                                            icon: <EditIcon />,
                                                            onClick: () => navigate(`/services/${service.id}/edit`),
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
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Content Body */}
                                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                                    {service.service_code || `SRV-${service.id}`}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${getTypeBadgeStyles(service.type)}`}>
                                                    {t(`types.${service.type}`)}
                                                </span>
                                            </div>

                                            <h3 className="font-bold text-base text-gray-900 line-clamp-1 group-hover:text-[#E91E63] transition-colors mt-1">
                                                {currentLang === 'ar' ? service.name_ar : service.name_en}
                                            </h3>
                                            <p className="text-xs text-gray-400 line-clamp-2 mt-1 min-h-[32px]">
                                                {currentLang === 'ar' ? service.description_ar : service.description_en}
                                            </p>
                                        </div>

                                        {/* Pricing & Rating Info */}
                                        <div className="border-t border-gray-100 pt-3 space-y-2 text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 font-medium">{t('table.base_price')}</span>
                                                <span className="font-black text-gray-900 text-sm">
                                                    {service.base_price} <span className="text-[10px] font-normal text-gray-400">{service.price_details?.currency || 'EGP'}</span>
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 font-medium">{t('table.rating')}</span>
                                                <div className="flex items-center gap-1 text-amber-500 font-bold">
                                                    <span>{service.avg_rating || 5.0}</span>
                                                    <svg className="w-3.5 h-3.5 fill-amber-400" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Assigned Workers Section */}
                                        <div className="border-t border-gray-100 pt-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                    {isArabic ? 'العاملات المخصصات' : 'Assigned Workers'}
                                                </span>
                                                <span className="text-[10px] font-black text-[#E91E63] bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-full">
                                                    {assignedWorkers.length} {isArabic ? 'عاملة' : 'workers'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                                                {assignedWorkers.length > 0 ? (
                                                    assignedWorkers.slice(0, 5).map((w) => (
                                                        <div key={w.id} className="relative group/worker" title={w.name || w.full_name}>
                                                            {w.image || w.photo ? (
                                                                <img src={w.image || w.photo} alt={w.name} className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-sm" />
                                                            ) : (
                                                                <div className="w-7 h-7 rounded-full bg-pink-100 border-2 border-white text-[#E91E63] font-bold text-[10px] flex items-center justify-center shadow-sm">
                                                                    {(w.name || w.full_name || '?').charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-[11px] text-gray-400 italic">
                                                        {isArabic ? 'لا توجد عاملات مخصصات حالياً' : 'No assigned workers'}
                                                    </span>
                                                )}
                                                {assignedWorkers.length > 5 && (
                                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                                        +{assignedWorkers.length - 5}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
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
                                <option value="hourly">{t('types.hourly')}</option>
                                <option value="other">{isArabic ? 'أخرى' : 'Other'}</option>
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