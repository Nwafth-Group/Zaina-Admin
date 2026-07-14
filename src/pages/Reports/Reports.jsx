import React, { useMemo, useState, useEffect } from 'react';
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
        if (search) params.append('booking_id', search); // Search by booking ID/Ref
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'submitted':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'under_review':
                return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'in_progress':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'resolved':
                return 'bg-green-50 text-green-700 border-green-200';
            case 'rejected':
                return 'bg-red-50 text-red-700 border-red-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{t('title')}</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        {isArabic ? 'إدارة ومتابعة تذاكر مشاكل العملاء لحجوزات الخدمة' : 'Manage and track booking issue tickets submitted by customers'}
                    </p>
                </div>
            </div>

            {/* Filters & Tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
                {/* Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3">
                    <button
                        onClick={() => selectStatus('')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            statusFilter === ''
                                ? 'bg-[#E91E63] text-white'
                                : 'text-gray-600 hover:bg-[#FDF0F3] hover:text-[#E91E63]'
                        }`}
                    >
                        {isArabic ? 'الكل' : 'All'}
                    </button>
                    {['submitted', 'under_review', 'resolved'].map((status) => (
                        <button
                            key={status}
                            onClick={() => selectStatus(status)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                statusFilter === status
                                    ? 'bg-[#E91E63] text-white'
                                    : 'text-gray-600 hover:bg-[#FDF0F3] hover:text-[#E91E63]'
                            }`}
                        >
                            {t(`status.${status}`)}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <svg
                            className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder={isArabic ? 'البحث بواسطة رقم الحجز...' : 'Search by Booking ID/Ref...'}
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full ltr:pl-10 rtl:pr-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63]"
                        />
                    </div>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left rtl:text-right">
                        <thead className="bg-[#F8F9FA] text-gray-700 text-xs font-semibold uppercase border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">{t('table.report_number')}</th>
                                <th className="px-6 py-4">{t('table.booking_id')}</th>
                                <th className="px-6 py-4">{t('table.customer')}</th>
                                <th className="px-6 py-4">{t('table.service')}</th>
                                <th className="px-6 py-4">{t('table.reason')}</th>
                                <th className="px-6 py-4">{t('table.status')}</th>
                                <th className="px-6 py-4">{t('table.created_date')}</th>
                                <th className="px-6 py-4 text-center">{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-400">
                                        <div className="flex justify-center items-center gap-2">
                                            <span className="w-5 h-5 border-2 border-t-transparent border-[#E91E63] rounded-full animate-spin"></span>
                                            {t('loading')}
                                        </div>
                                    </td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-400">
                                        {t('no_data')}
                                    </td>
                                </tr>
                            ) : (
                                reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-[#FDF0F3] hover:bg-opacity-20 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-gray-800">
                                            {report.report_number || `REP-${report.id}`}
                                        </td>
                                        <td className="px-6 py-4">
                                            {report.booking_ref || `#${report.booking_id}`}
                                        </td>
                                        <td className="px-6 py-4">
                                            {report.customer_name || (isArabic ? 'عميل زينة' : 'Zaina Customer')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {report.service_name || '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-700">
                                                {t(`reasons.${report.reason}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(report.status)}`}>
                                                {t(`status.${report.status}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {report.created_at}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setDetailsId(report.id)}
                                                className="px-3 py-1.5 bg-[#FDF0F3] text-[#E91E63] hover:bg-[#E91E63] hover:text-white rounded-lg text-xs font-medium transition-all"
                                            >
                                                {t('details.title')}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {meta && meta.last_page > 1 && (
                    <div className="p-4 border-t border-gray-100">
                        <Pagination
                            currentPage={page}
                            totalPages={meta.last_page}
                            onPageChange={(p) => setPage(p)}
                        />
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
