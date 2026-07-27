import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios.js';
import Pagination from '../../component/Pagination.jsx';
import ReportDetailsModal from './ReportDetailsModal';

export default function Reports() {
    const { t, i18n } = useTranslation('reports');
    const isArabic = i18n.language?.startsWith('ar');

    const [detailsId, setDetailsId] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);

    const lastCountsRef = useRef({ all: 0, submitted: 0, under_review: 0, in_progress: 0, resolved: 0, rejected: 0 });

    // Debounce search input
    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 400);
        return () => clearTimeout(id);
    }, [searchInput]);

    const selectStatus = (status) => {
        setStatusFilter(status);
        setPage(1);
    };

    const queryString = useMemo(() => {
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.append('booking_id', search);
        if (statusFilter) params.append('status', statusFilter);
        return params.toString();
    }, [page, search, statusFilter]);

    // Fetch reports
    const { data: pageData, isLoading, isError, error } = useQuery({
        queryKey: ['reports', queryString],
        queryFn: async () => {
            const response = await axiosInstance.get(`/admin/reports?${queryString}`);
            return response.data.data;
        },
        keepPreviousData: true,
    });

    const reports = pageData?.items || [];
    const meta = pageData?.meta;

    if (pageData?.counts) {
        lastCountsRef.current = pageData.counts;
    }
    const counts = lastCountsRef.current;

    const cardTabs = [
        { key: '', label: isArabic ? 'جميع البلاغات' : 'All Issues', count: counts.all, icon: '🚨', color: 'bg-[#FDF0F3] border-[#fbdbe3]' },
        { key: 'submitted', label: isArabic ? 'جديدة' : 'New Submitted', count: counts.submitted, icon: '📩', color: 'bg-blue-50 border-blue-200' },
        { key: 'under_review', label: isArabic ? 'قيد المراجعة' : 'Under Review', count: counts.under_review, icon: '⏳', color: 'bg-amber-50 border-amber-200' },
        { key: 'in_progress', label: isArabic ? 'قيد المعالجة' : 'In Progress', count: counts.in_progress, icon: '⚙️', color: 'bg-purple-50 border-purple-200' },
        { key: 'resolved', label: isArabic ? 'تم الحل' : 'Resolved', count: counts.resolved, icon: '✅', color: 'bg-emerald-50 border-emerald-200' },
    ];

    if (isError) return <div className="p-8 text-red-500 font-bold">{error.message}</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'شكاوى وبلاغات العملاء' : 'Customer Issues & Complaints'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'متابعة ومعالجة البلاغات والشكاوى الواردة من العملاء بشأن حجوزات الخدمات.' : 'Track, review, and resolve customer complaints regarding service bookings.'}
                    </p>
                </div>
            </div>

            {/* Metric Summary Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {cardTabs.map((card) => {
                    const isActive = statusFilter === card.key;
                    return (
                        <button
                            key={card.key}
                            onClick={() => selectStatus(card.key)}
                            className={`p-3.5 rounded-xl border  transition-all flex items-center justify-between ${
                                isActive ? `${card.color} ring-2 ring-[#E91E63]/30 shadow-sm` : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div>
                                <p className="text-[11px] font-bold text-gray-500">{card.label}</p>
                                <p className="text-xl font-black text-gray-900 mt-1">{card.count ?? 0}</p>
                            </div>
                            <div className="text-xl">{card.icon}</div>
                        </button>
                    );
                })}
            </div>

            {/* Search Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
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
                        placeholder={isArabic ? 'البحث بواسطة رقم الحجز...' : 'Search by Booking ID/Ref...'}
                        className="w-full border border-gray-200 rounded-lg ps-9 pe-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] outline-none"
                    />
                </div>
            </div>

            {/* Reports / Issues Data Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full  border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider ">
                                <th className="py-3.5 px-4 ">{t('table.report_number')}</th>
                                <th className="py-3.5 px-4 ">{t('table.booking_id')}</th>
                                <th className="py-3.5 px-4 ">{t('table.customer')}</th>
                                <th className="py-3.5 px-4 ">{t('table.service')}</th>
                                <th className="py-3.5 px-4 ">{t('table.reason')}</th>
                                <th className="py-3.5 px-4 ">{t('table.status')}</th>
                                <th className="py-3.5 px-4 ">{t('table.created_date')}</th>
                                <th className="py-3.5 px-4  w-28">{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="py-12  text-xs text-gray-400 font-bold">
                                        <div className="flex justify-center items-center gap-2">
                                            <svg className="animate-spin h-4 w-4 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                            <span>{t('loading')}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12  text-xs text-gray-400 font-bold">
                                        {t('no_data')}
                                    </td>
                                </tr>
                            ) : (
                                reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50/80 transition-colors ">
                                        <td className="py-3 px-4  font-bold text-gray-900">
                                            {report.report_number || `REP-${report.id}`}
                                        </td>
                                        <td className="py-3 px-4  font-mono font-bold text-gray-700" dir="ltr">
                                            {report.booking_ref || `#${report.booking_id}`}
                                        </td>
                                        <td className="py-3 px-4  font-bold text-gray-900">
                                            {report.customer_name || (isArabic ? 'عميل زينة' : 'Zaina Customer')}
                                        </td>
                                        <td className="py-3 px-4  font-medium text-gray-700">
                                            {report.service_name || '—'}
                                        </td>
                                        <td className="py-3 px-4 ">
                                            <span className="font-bold text-gray-800">
                                                {t(`reasons.${report.reason}`, { defaultValue: report.reason })}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 ">
                                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${
                                                report.status === 'submitted'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : report.status === 'under_review'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                    : report.status === 'in_progress'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                    : report.status === 'resolved'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    report.status === 'submitted' ? 'bg-blue-500' :
                                                    report.status === 'under_review' ? 'bg-amber-500' :
                                                    report.status === 'in_progress' ? 'bg-purple-500' :
                                                    report.status === 'resolved' ? 'bg-emerald-500' : 'bg-rose-500'
                                                }`} />
                                                {t(`status.${report.status}`, { defaultValue: report.status })}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4  text-xs text-gray-500 font-medium" dir="ltr">
                                            {report.created_at}
                                        </td>
                                        <td className="py-3 px-4 ">
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => setDetailsId(report.id)}
                                                    className="px-3 py-1.5 bg-[#FDF0F3] text-[#E91E63] hover:bg-[#E91E63] hover:text-white rounded-lg text-xs font-bold transition shadow-sm"
                                                >
                                                    {t('details.title')}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {meta && (
                    <div className="p-3.5 border-t border-gray-100 flex justify-between items-center">
                        <Pagination meta={meta} onPageChange={setPage} />
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {detailsId && (
                <ReportDetailsModal
                    reportId={detailsId}
                    onClose={() => setDetailsId(null)}
                />
            )}
        </div>
    );
}
