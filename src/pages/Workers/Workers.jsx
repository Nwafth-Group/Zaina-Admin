import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import WorkerActionModal from './WorkerActionModal';
import RowActionsMenu, { EditIcon, ToggleIcon, TrashIcon } from '../../component/RowActionsMenu.jsx';
import TagList from '../../component/TagList.jsx';
import Pagination from '../../component/Pagination.jsx';
import { hasPermission } from '../../utils/permissions.js';

const DEFAULT_FILTERS = {
    status: '',
    nationality: '',
    service_id: '',
    min_rating: '',
    sort_by: 'created_at',
    sort_dir: 'desc',
};

export default function Workers() {
    const { t, i18n } = useTranslation('workers');
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isArabic = i18n.language?.startsWith('ar');

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');              // committed search (lives in the header, applies live)
    const [filters, setFilters] = useState(DEFAULT_FILTERS); // committed drawer filters (drive the query)
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS); // staged inside the drawer until "Apply"
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [actionModal, setActionModal] = useState({ isOpen: false, workerToEdit: null });
    const [deleteConfirm, setDeleteConfirm] = useState({
        isOpen: false,
        workerId: null,
        workerName: '',
        hasBookings: false,
        bookingsCount: 0
    });

    // Debounce the free-text search before it hits the API.
    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(id);
    }, [searchInput]);

    // Seed the draft from the committed filters whenever the drawer opens.
    const openFilters = () => {
        setDraftFilters(filters);
        setIsFilterOpen(true);
    };

    const updateDraft = (key, value) => setDraftFilters((d) => ({ ...d, [key]: value }));

    const handleSortChange = (value) => {
        const [sort_by, sort_dir] = value.split(':');
        setDraftFilters((d) => ({ ...d, sort_by, sort_dir }));
    };

    // Commit the staged filters (this is what actually runs the query).
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

    // Drawer filters that are active (committed). Search lives in the header.
    const activeFilterCount =
        (filters.status ? 1 : 0) +
        (filters.nationality ? 1 : 0) +
        (filters.service_id ? 1 : 0) +
        (filters.min_rating ? 1 : 0) +
        (filters.sort_by !== DEFAULT_FILTERS.sort_by || filters.sort_dir !== DEFAULT_FILTERS.sort_dir ? 1 : 0);

    // 1. جلب العمال مع الفلاتر وترقيم الصفحات
    const { data: paginatedData, isLoading, isError, error } = useQuery({
        queryKey: ['workers', queryString],
        queryFn: async () => {
            const response = await axiosInstance.get(`/admin/workers?${queryString}`);
            return response.data.data;
        },
        keepPreviousData: true,
    });

    // 2. خيارات الفلاتر (الجنسيات + الخدمات)
    const { data: nationalities = [] } = useQuery({
        queryKey: ['worker-nationalities'],
        queryFn: async () => (await axiosInstance.get('/admin/workers/nationalities')).data.data,
    });

    const { data: servicesResp } = useQuery({
        queryKey: ['services-for-filter'],
        queryFn: async () => (await axiosInstance.get('/admin/services')).data.data,
    });
    const services = servicesResp?.items || [];

    // 3. تغيير حالة العامل
    const toggleStatusMutation = useMutation({
        mutationFn: (workerId) => axiosInstance.post(`/admin/workers/${workerId}/toggle-status`),
        onSuccess: (response) => {
            toast.success(response.data?.message || 'تم تغيير الحالة بنجاح');
            queryClient.invalidateQueries({ queryKey: ['workers'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء العملية.');
        },
    });

    const deleteWorkerMutation = useMutation({
        mutationFn: (workerId) => axiosInstance.delete(`/admin/workers/${workerId}`),
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم حذف العامل بنجاح' : 'Worker deleted successfully'));
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            setDeleteConfirm({ isOpen: false, workerId: null, workerName: '', hasBookings: false, bookingsCount: 0 });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || (isArabic ? 'حدث خطأ أثناء العملية.' : 'An error occurred during deletion.'));
        },
    });

    const workers = paginatedData?.items || [];
    const meta = paginatedData?.meta;

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';

    const serviceLabel = (service) =>
        service && typeof service === 'object'
            ? (isArabic ? (service.name_ar || service.name_en) : (service.name_en || service.name_ar))
            : '—';

    if (isError) return <div className="p-8 text-red-500 font-bold">حدث خطأ: {error.message}</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col min-h-[70vh]">

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
                    {hasPermission('workers.create') && (
                        <button
                            onClick={() => setActionModal({ isOpen: true, workerToEdit: null })}
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

            <div className="overflow-x-auto w-full flex-1">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500 min-w-[860px]">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-4 w-16 text-center">{t('table.image')}</th>
                            <th className="px-4 py-4">{t('table.name')}</th>
                            <th className="px-4 py-4">{t('table.nationality')}</th>
                            <th className="px-4 py-4">{isArabic ? 'الخدمة المعينة' : 'Assigned Service'}</th>
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
                                        <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                        <span className="text-lg font-medium">{t('loading')}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : workers.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-10 text-center text-gray-500">{t('no_data')}</td>
                            </tr>
                        ) : (
                            workers.map((worker) => (
                                <tr key={worker.id} onClick={() => navigate(`/workers/${worker.id}`)} className="border-b transition-colors hover:bg-gray-50 bg-white cursor-pointer">
                                    <td className="px-4 py-3 text-center">
                                        <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                                            {worker.image ? (
                                                <img src={worker.image} alt={worker.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-gray-400 font-bold text-lg">
                                                    {worker.name ? worker.name.charAt(0) : '?'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-gray-800">{worker.name}</td>
                                    <td className="px-4 py-3 text-gray-600">{worker.nationality}</td>
                                    <td className="px-4 py-3">
                                        {worker.assigned_service ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FDF0F3] text-[#E91E63] whitespace-nowrap">
                                                {serviceLabel(worker.assigned_service)}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 font-medium">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1 bg-yellow-50/50 border border-yellow-100/50 rounded-lg py-1 px-2 w-max mx-auto">
                                            <span className="text-xs font-mono font-bold text-yellow-600 mt-0.5">{Number(worker.rating || 0).toFixed(2)}</span>
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                            worker.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {worker.status === 'active' ? t('status.active') : t('status.inactive')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        {hasPermission('workers.edit') ? (
                                            <RowActionsMenu
                                                label={t('actions.edit')}
                                                items={[
                                                    {
                                                        key: 'edit',
                                                        label: t('actions.edit'),
                                                        icon: <EditIcon />,
                                                        onClick: () => setActionModal({ isOpen: true, workerToEdit: worker }),
                                                    },
                                                    {
                                                        key: 'toggle',
                                                        label: t('actions.toggle_status'),
                                                        icon: <ToggleIcon />,
                                                        onClick: () => toggleStatusMutation.mutate(worker.id),
                                                        disabled: toggleStatusMutation.isPending,
                                                    },
                                                    hasPermission('workers.delete') && {
                                                        key: 'delete',
                                                        label: isArabic ? 'حذف' : 'Delete',
                                                        icon: <TrashIcon />,
                                                        danger: true,
                                                        onClick: () => {
                                                            setDeleteConfirm({
                                                                isOpen: true,
                                                                workerId: worker.id,
                                                                workerName: worker.name,
                                                                hasBookings: (worker.bookings_count ?? 0) > 0,
                                                                bookingsCount: worker.bookings_count ?? 0
                                                            });
                                                        },
                                                        disabled: deleteWorkerMutation.isPending,
                                                    },
                                                ].filter(Boolean)}
                                            />
                                        ) : (
                                            <span className="text-gray-300 text-xs font-medium">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
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
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.nationality_label')}</label>
                            <select value={draftFilters.nationality} onChange={(e) => updateDraft('nationality', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.all_nationalities')}</option>
                                {nationalities.map((nat) => (
                                    <option key={nat} value={nat}>{nat}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.service_label')}</label>
                            <select value={draftFilters.service_id} onChange={(e) => updateDraft('service_id', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.all_services')}</option>
                                <option value="none">{t('filters.no_services')}</option>
                                {services.map((service) => (
                                    <option key={service.id} value={service.id}>{serviceLabel(service)}</option>
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
                                <option value="name:asc">{t('filters.sort_name')}</option>
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

            {actionModal.isOpen && (
                <WorkerActionModal
                    workerToEdit={actionModal.workerToEdit}
                    onClose={() => setActionModal({ isOpen: false, workerToEdit: null })}
                />
            )}

            {deleteConfirm.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                        onClick={() => setDeleteConfirm({ isOpen: false, workerId: null, workerName: '', hasBookings: false, bookingsCount: 0 })}
                    />
                    
                    {/* Modal Content */}
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full relative z-10 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                        {deleteConfirm.hasBookings ? (
                            <>
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mx-auto mb-4">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                
                                <h3 className="text-lg font-bold text-gray-800 text-center mb-2">
                                    {isArabic ? 'تنبيه: لا يمكن حذف العامل' : 'Warning: Cannot Delete Worker'}
                                </h3>
                                <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
                                    {isArabic 
                                        ? `لا يمكن حذف العامل "${deleteConfirm.workerName}" لوجود ${deleteConfirm.bookingsCount} حجز(حجوزات) نشطة مرتبطة به في النظام. يرجى إلغاء الحجوزات أو تعيينها لعامل آخر أولاً.` 
                                        : `Cannot delete worker "${deleteConfirm.workerName}" because they are associated with ${deleteConfirm.bookingsCount} active booking(s). Please cancel or reassign the bookings first.`}
                                </p>
                                
                                <div className="flex justify-center">
                                    <button
                                        onClick={() => setDeleteConfirm({ isOpen: false, workerId: null, workerName: '', hasBookings: false, bookingsCount: 0 })}
                                        className="px-6 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors text-sm"
                                    >
                                        {isArabic ? 'إغلاق' : 'Close'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mx-auto mb-4">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                
                                <h3 className="text-lg font-bold text-gray-800 text-center mb-2">
                                    {isArabic ? 'تأكيد حذف العامل' : 'Confirm Worker Deletion'}
                                </h3>
                                <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
                                    {isArabic 
                                        ? `هل أنت متأكد من رغبتك في حذف العامل "${deleteConfirm.workerName}"؟ لا يمكن التراجع عن هذا الإجراء.` 
                                        : `Are you sure you want to delete worker "${deleteConfirm.workerName}"? This action cannot be undone.`}
                                </p>
                                
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => setDeleteConfirm({ isOpen: false, workerId: null, workerName: '', hasBookings: false, bookingsCount: 0 })}
                                        className="px-5 py-2.5 rounded-full border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
                                    >
                                        {isArabic ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            deleteWorkerMutation.mutate(deleteConfirm.workerId);
                                        }}
                                        disabled={deleteWorkerMutation.isPending}
                                        className="px-5 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium transition-colors text-sm flex items-center gap-2"
                                    >
                                        {deleteWorkerMutation.isPending && (
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                        )}
                                        {isArabic ? 'تأكيد الحذف' : 'Confirm Delete'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}
