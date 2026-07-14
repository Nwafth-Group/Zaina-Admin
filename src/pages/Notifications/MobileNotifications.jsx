import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import MobileNotificationActionModal from './MobileNotificationActionModal';
import RowActionsMenu, { EditIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';

const DEFAULT_FILTERS = {
    status: '',
    audience: '',
    sort_by: 'created_at',
    sort_dir: 'desc',
    per_page: 15,
};

export default function MobileNotifications() {
    const { t } = useTranslation('notifications');
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [actionModal, setActionModal] = useState({ isOpen: false, notificationToEdit: null });

    // Debounce search input
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
        (filters.audience ? 1 : 0) +
        (filters.sort_by !== DEFAULT_FILTERS.sort_by || filters.sort_dir !== DEFAULT_FILTERS.sort_dir ? 1 : 0);

    const { data: paginatedData, isLoading, isError, error } = useQuery({
        queryKey: ['mobile-notifications', queryString],
        queryFn: async () => (await axiosInstance.get(`/admin/mobile-notifications?${queryString}`)).data.data,
        keepPreviousData: true,
    });

    const notifications = paginatedData?.items || [];
    const meta = paginatedData?.meta;

    const cancelMutation = useMutation({
        mutationFn: (id) => axiosInstance.patch(`/admin/mobile-notifications/${id}/cancel`),
        onSuccess: (response) => {
            toast.success(response.data?.message || "تم إلغاء الإشعار بنجاح");
            queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "حدث خطأ أثناء إلغاء الإشعار.");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => axiosInstance.delete(`/admin/mobile-notifications/${id}`),
        onSuccess: (response) => {
            toast.success(response.data?.message || "تم حذف الإشعار بنجاح");
            queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "حدث خطأ أثناء حذف الإشعار.");
        },
    });

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';

    if (isError) return <div className="p-8 text-red-500 font-bold">{error.message}</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col min-h-[70vh]">
            
            {/* Header Toolbar */}
            <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('title', { defaultValue: 'إشعارات الهاتف' })}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('subtitle', { defaultValue: 'جدولة وإرسال إشعارات فورية لتطبيق العملاء.' })}</p>
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
                            placeholder={t('filters.search_placeholder', { defaultValue: 'البحث في الإشعارات...' })}
                            className={`${selectClass} w-full ps-9`}
                        />
                    </div>

                    {/* Filters Toggle */}
                    <button
                        onClick={openFilters}
                        className="relative inline-flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 018 17v-3.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        <span>{t('filters.button', { defaultValue: 'الفلاتر' })}</span>
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-2 -end-2 bg-[#E91E63] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {/* Create Notification button */}
                    <button
                        onClick={() => setActionModal({ isOpen: true, notificationToEdit: null })}
                        className="bg-[#E91E63] text-white px-5 py-2 rounded-full font-medium hover:bg-[#D81B60] transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {t('add_new', { defaultValue: 'إنشاء إشعار' })}
                    </button>
                </div>
            </div>

            {/* Notifications Table */}
            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-start border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider">
                            <th className="px-6 py-4 text-start">{t('table.title', { defaultValue: 'العنوان الداخلي' })}</th>
                            <th className="px-4 py-4 text-start">{t('table.audience', { defaultValue: 'الجمهور المستهدف' })}</th>
                            <th className="px-4 py-4 text-start">{t('table.platforms', { defaultValue: 'منصات الهاتف' })}</th>
                            <th className="px-4 py-4 text-start">{t('table.schedule', { defaultValue: 'موعد الإرسال' })}</th>
                            <th className="px-4 py-4 text-start w-32">{t('table.status', { defaultValue: 'الحالة' })}</th>
                            <th className="px-4 py-4 text-start">{t('table.creator', { defaultValue: 'بواسطة' })}</th>
                            <th className="px-4 py-4 text-center w-24">{t('table.actions', { defaultValue: 'الإجراءات' })}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
                        {isLoading ? (
                            <tr>
                                <td colSpan="7" className="py-16 text-center text-gray-500 font-medium">
                                    <div className="flex justify-center items-center gap-3">
                                        <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                        <span>{t('loading', { defaultValue: 'جاري تحميل الإشعارات...' })}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : notifications.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="py-16 text-center text-gray-400 font-medium">
                                    {t('no_data', { defaultValue: 'لا توجد إشعارات مجدولة بعد.' })}
                                </td>
                            </tr>
                        ) : (
                            notifications.map((notification) => (
                                <tr key={notification.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-gray-800">
                                        {notification.title}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            notification.audience === 'all'
                                                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                                : notification.audience === 'active_customers'
                                                ? 'bg-green-50 text-green-700 border border-green-100'
                                                : 'bg-orange-50 text-orange-700 border border-orange-100'
                                        }`}>
                                            {notification.audience === 'all'
                                                ? 'كل المستخدمين'
                                                : notification.audience === 'active_customers'
                                                ? 'العملاء النشطين'
                                                : 'العملاء غير النشطين'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {notification.platforms.map((plat) => (
                                                <span key={plat} className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700 uppercase">
                                                    {plat}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 font-mono text-xs">
                                        {notification.send_date} {notification.send_time}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            notification.status === 'scheduled'
                                                ? 'bg-yellow-50 text-yellow-700'
                                                : notification.status === 'sent'
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                notification.status === 'scheduled'
                                                    ? 'bg-yellow-500'
                                                    : notification.status === 'sent'
                                                    ? 'bg-green-600'
                                                    : 'bg-gray-400'
                                            }`} />
                                            {notification.status === 'scheduled'
                                                ? 'مجدول'
                                                : notification.status === 'sent'
                                                ? 'تم الإرسال'
                                                : 'ملغى'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-xs text-gray-500">
                                        {notification.creator_name || '--'}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <RowActionsMenu
                                            label={t('actions.title', { defaultValue: 'الإجراءات' })}
                                            items={[
                                                {
                                                    key: 'edit',
                                                    label: t('actions.edit', { defaultValue: 'تعديل' }),
                                                    icon: <EditIcon />,
                                                    onClick: () => setActionModal({ isOpen: true, notificationToEdit: notification }),
                                                    hidden: notification.status !== 'scheduled',
                                                },
                                                {
                                                    key: 'cancel',
                                                    label: t('actions.cancel', { defaultValue: 'إلغاء الإرسال' }),
                                                    icon: (
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                        </svg>
                                                    ),
                                                    onClick: () => {
                                                        if (window.confirm("هل أنت متأكد من إلغاء جدولة هذا الإشعار؟")) {
                                                            cancelMutation.mutate(notification.id);
                                                        }
                                                    },
                                                    disabled: cancelMutation.isPending,
                                                    hidden: notification.status !== 'scheduled',
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
                                                        if (window.confirm("هل أنت متأكد من حذف هذا الإشعار؟")) {
                                                            deleteMutation.mutate(notification.id);
                                                        }
                                                    },
                                                    disabled: deleteMutation.isPending,
                                                    hidden: notification.status === 'sent',
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

            {/* Pagination Controls */}
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
                <aside className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${isFilterOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800">{t('filters.title', { defaultValue: 'الفلاتر' })}</h3>
                        <button onClick={() => setIsFilterOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" aria-label="close">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.status_label', { defaultValue: 'حالة الإرسال' })}</label>
                            <select value={draftFilters.status} onChange={(e) => updateDraft('status', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.all_statuses', { defaultValue: 'كل الحالات' })}</option>
                                <option value="scheduled">مجدول</option>
                                <option value="sent">تم الإرسال</option>
                                <option value="cancelled">ملغى</option>
                            </select>
                        </div>

                        {/* Audience */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.audience_label', { defaultValue: 'الجمهور المستهدف' })}</label>
                            <select value={draftFilters.audience} onChange={(e) => updateDraft('audience', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.all_audiences', { defaultValue: 'كل الجماهير' })}</option>
                                <option value="all">كل المستخدمين</option>
                                <option value="active_customers">العملاء النشطين</option>
                                <option value="inactive_customers">العملاء غير النشطين</option>
                            </select>
                        </div>

                        {/* Sorting */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.sort_label', { defaultValue: 'ترتيب حسب' })}</label>
                            <select value={`${draftFilters.sort_by}:${draftFilters.sort_dir}`} onChange={(e) => handleSortChange(e.target.value)} className={`${selectClass} w-full`}>
                                <option value="created_at:desc">الأحدث إضافة</option>
                                <option value="send_date:asc">الأقرب موعد إرسال</option>
                                <option value="send_date:desc">الأبعد موعد إرسال</option>
                            </select>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-100 flex items-center gap-3">
                        <button
                            onClick={resetFilters}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                        >
                            {t('filters.reset', { defaultValue: 'إعادة تعيين' })}
                        </button>
                        <button
                            onClick={applyFilters}
                            className="flex-1 px-4 py-2 bg-[#E91E63] text-white rounded-lg hover:bg-[#D81B60] font-medium transition-colors"
                        >
                            {t('filters.done', { defaultValue: 'تطبيق' })}
                        </button>
                    </div>
                </aside>
            </div>

            {actionModal.isOpen && (
                <MobileNotificationActionModal
                    notificationToEdit={actionModal.notificationToEdit}
                    onClose={() => setActionModal({ isOpen: false, notificationToEdit: null })}
                />
            )}
        </div>
    );
}
