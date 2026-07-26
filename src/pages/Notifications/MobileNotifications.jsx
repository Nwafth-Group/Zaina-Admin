import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import RowActionsMenu, { EyeIcon, EditIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';

const DEFAULT_FILTERS = {
    status: '',
    audience: '',
    sort_by: 'created_at',
    sort_dir: 'desc',
    per_page: 15,
};

export default function MobileNotifications() {
    const { t, i18n } = useTranslation('notifications');
    const navigate = useNavigate();
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const lastCountsRef = useRef({ all: 0, scheduled: 0, sent: 0, failed: 0 });

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
        const params = new URLSearchParams({ page: String(page), per_page: String(filters.per_page) });
        if (search) params.append('search', search);
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== '' && value != null && key !== 'per_page') params.append(key, value);
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

    if (paginatedData?.counts) {
        lastCountsRef.current = paginatedData.counts;
    }
    const counts = lastCountsRef.current;

    const cancelMutation = useMutation({
        mutationFn: (id) => axiosInstance.patch(`/admin/mobile-notifications/${id}/cancel`),
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? "تم إلغاء الإشعار بنجاح" : "Notification cancelled successfully"));
            queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || (isArabic ? "حدث خطأ أثناء إلغاء الإشعار." : "Error cancelling notification."));
        },
    });

    const sendNowMutation = useMutation({
        mutationFn: (id) => axiosInstance.post(`/admin/mobile-notifications/${id}/send-now`),
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? "تم إرسال الإشعار بنجاح" : "Notification sent successfully"));
            queryClient.invalidateQueries({ queryKey: ['mobile-notifications'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || (isArabic ? "حدث خطأ أثناء إرسال الإشعار." : "Error sending notification."));
        },
    });

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';

    if (isError) return <div className="p-8 text-red-500 font-bold">{error.message}</div>;

    const cardTabs = [
        { key: '', label: isArabic ? 'جميع الإشعارات' : 'All Notifications', count: counts.all, icon: '📲', color: 'bg-[#FDF0F3] border-[#fbdbe3]' },
        { key: 'scheduled', label: isArabic ? 'المجدولة' : 'Scheduled', count: counts.scheduled, icon: '⏳', color: 'bg-[#E91E63]' },
        { key: 'sent', label: isArabic ? 'تم إرسالها' : 'Sent', count: counts.sent, icon: '✅', color: 'bg-emerald-50 border-emerald-200' },
        { key: 'failed', label: isArabic ? 'فشلت / ملغاة' : 'Failed / Cancelled', count: counts.failed, icon: '❌', color: 'bg-rose-50 border-rose-200' },
    ];

    return (
        <div className="space-y-6 font-main w-full">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'إشعارات الهاتف المحمول' : 'Mobile Push Notifications'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'جدولة وإرسال التنبيهات المباشرة لتطبيقات العملاء.' : 'Schedule and broadcast push notifications directly to user devices.'}
                    </p>
                </div>

                <button
                    onClick={() => navigate('/mobile-notifications/create')}
                    className="bg-[#E91E63] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#D81B60] transition shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto outline-none"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{t('add_new', { defaultValue: isArabic ? 'إنشاء إشعار' : 'Create Notification' })}</span>
                </button>
            </div>

            {/* Metric Tabs Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                        placeholder={t('filters.search_placeholder', { defaultValue: isArabic ? 'البحث في الإشعارات...' : 'Search notifications...' })}
                        className="w-full border border-gray-200 rounded-lg ps-9 pe-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button
                        onClick={openFilters}
                        className="relative inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-3.5 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
                    >
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <span>{t('filters.button', { defaultValue: isArabic ? 'تصفية' : 'Filter' })}</span>
                        {activeFilterCount > 0 && (
                            <span className="bg-[#E91E63] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">
                                <th className="py-3.5 px-4 text-center">{isArabic ? 'عنوان الإشعار' : 'Notification Title'}</th>
                                <th className="py-3.5 px-4 text-center">{isArabic ? 'الجمهور المستهدف' : 'Audience'}</th>
                                <th className="py-3.5 px-4 text-center">{isArabic ? 'وقت الإرسال' : 'Send Time'}</th>
                                <th className="py-3.5 px-4 text-center">{isArabic ? 'الحالة' : 'Status'}</th>
                                <th className="py-3.5 px-4 text-center">{isArabic ? 'المُنشئ' : 'Created By'}</th>
                                <th className="py-3.5 px-4 text-center">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-xs text-gray-400 font-bold">
                                        <div className="flex justify-center items-center gap-2">
                                            <svg className="animate-spin h-4 w-4 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                            <span>{t('loading', { defaultValue: isArabic ? 'جاري تحميل الإشعارات...' : 'Loading notifications...' })}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : notifications.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-xs text-gray-400 font-bold">
                                        {t('no_data', { defaultValue: isArabic ? 'لا توجد إشعارات مجدولة بعد.' : 'No notifications scheduled yet.' })}
                                    </td>
                                </tr>
                            ) : (
                                notifications.map((notification) => (
                                    <tr key={notification.id} onClick={() => navigate(`/mobile-notifications/${notification.id}`)} className="hover:bg-gray-50/80 transition-colors cursor-pointer">
                                        <td className="py-3 px-4 text-start font-bold text-gray-900">
                                            {notification.title}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${
                                                notification.audience === 'all'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : notification.audience === 'active_customers'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                            }`}>
                                                {notification.audience === 'all'
                                                    ? (isArabic ? 'كل المستخدمين' : 'All Users')
                                                    : notification.audience === 'active_customers'
                                                    ? (isArabic ? 'العملاء النشطين' : 'Active Customers')
                                                    : (isArabic ? 'العملاء غير النشطين' : 'Inactive Customers')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center font-mono text-xs font-bold text-gray-700" dir="ltr">
                                            {notification.send_date} {notification.send_time}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${
                                                notification.status === 'scheduled'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                    : notification.status === 'sent'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    notification.status === 'scheduled'
                                                        ? 'bg-amber-500 animate-pulse'
                                                        : notification.status === 'sent'
                                                        ? 'bg-emerald-500'
                                                        : 'bg-gray-400'
                                                }`} />
                                                {notification.status === 'scheduled'
                                                    ? (isArabic ? 'مجدول' : 'Scheduled')
                                                    : notification.status === 'sent'
                                                    ? (isArabic ? 'تم الإرسال' : 'Sent')
                                                    : (isArabic ? 'ملغى' : 'Cancelled')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center font-medium text-gray-600">
                                            {notification.creator?.full_name || notification.creator?.first_name || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-center">
                                                <RowActionsMenu
                                                    label={t('actions.title', { defaultValue: isArabic ? 'إجراءات' : 'Actions' })}
                                                    items={[
                                                        {
                                                            key: 'details',
                                                            label: isArabic ? 'التفاصيل' : 'View Details',
                                                            icon: <EyeIcon />,
                                                            onClick: () => navigate(`/mobile-notifications/${notification.id}`),
                                                        },
                                                        notification.status === 'scheduled' && {
                                                            key: 'send_now',
                                                            label: isArabic ? 'إرسال الآن' : 'Send Now',
                                                            onClick: () => {
                                                                if (window.confirm(isArabic ? 'هل تريد إرسال هذا الإشعار الآن؟' : 'Are you sure you want to send this notification now?')) {
                                                                    sendNowMutation.mutate(notification.id);
                                                                }
                                                            },
                                                        },
                                                        notification.status === 'scheduled' && {
                                                            key: 'edit',
                                                            label: t('actions.edit', { defaultValue: isArabic ? 'تعديل' : 'Edit' }),
                                                            icon: <EditIcon />,
                                                            onClick: () => navigate(`/mobile-notifications/${notification.id}/edit`),
                                                        },
                                                        notification.status === 'scheduled' && {
                                                            key: 'cancel',
                                                            label: isArabic ? 'إلغاء الإشعار' : 'Cancel',
                                                            danger: true,
                                                            onClick: () => {
                                                                if (window.confirm(isArabic ? 'هل أنت متأكد من إلغاء هذا الإشعار؟' : 'Are you sure you want to cancel this notification?')) {
                                                                    cancelMutation.mutate(notification.id);
                                                                }
                                                            },
                                                        },
                                                    ].filter(Boolean)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-3.5 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <Pagination meta={meta} onPageChange={setPage} />
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
                        <h3 className="text-lg font-bold text-gray-800">{t('filters.title', { defaultValue: isArabic ? 'الفلاتر' : 'Filters' })}</h3>
                        <button onClick={() => setIsFilterOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" aria-label="close">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{t('filters.status', { defaultValue: isArabic ? 'الحالة' : 'Status' })}</label>
                            <select
                                value={draftFilters.status}
                                onChange={(e) => updateDraft('status', e.target.value)}
                                className={`${selectClass} w-full`}
                            >
                                <option value="">{t('filters.all_statuses', { defaultValue: isArabic ? 'كل الحالات' : 'All Statuses' })}</option>
                                <option value="scheduled">{isArabic ? 'مجدول' : 'Scheduled'}</option>
                                <option value="sent">{isArabic ? 'تم الإرسال' : 'Sent'}</option>
                                <option value="failed">{isArabic ? 'ملغى / فشل' : 'Cancelled / Failed'}</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 flex gap-2">
                        <button onClick={resetFilters} className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                            {t('filters.reset', { defaultValue: isArabic ? 'إعادة ضبط' : 'Reset' })}
                        </button>
                        <button onClick={applyFilters} className="flex-1 py-2 text-xs font-bold text-white bg-[#E91E63] rounded-lg hover:bg-[#D81B60] transition">
                            {t('filters.apply', { defaultValue: isArabic ? 'تطبيق' : 'Apply' })}
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}
