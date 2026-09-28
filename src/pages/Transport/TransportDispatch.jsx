import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios.js';

const format12Hour = (timeStr) => {
    if (!timeStr || timeStr === '—' || timeStr === 'غير محدد') return timeStr || '—';
    const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (!match) return timeStr;
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
};

export default function TransportDispatch() {
    const { i18n } = useTranslation('common');
    const navigate = useNavigate();
    const isArabic = i18n.language?.startsWith('ar');

    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedGovernorate, setSelectedGovernorate] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedTime, setSelectedTime] = useState('');

    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        if (selectedDate) params.append('service_date', selectedDate);
        if (selectedGovernorate) params.append('governorate', selectedGovernorate);
        if (selectedStatus) params.append('status', selectedStatus);
        if (selectedTime) params.append('start_time', selectedTime);
        return params.toString();
    }, [selectedDate, selectedGovernorate, selectedStatus, selectedTime]);

    const { data: responseData, isLoading, isError, error } = useQuery({
        queryKey: ['transport-dispatch-overview', queryString],
        queryFn: async () => (await axiosInstance.get(`/admin/transport-dispatch/daily-overview?${queryString}`)).data,
    });

    const regions = responseData?.data?.items || [];
    const summary = responseData?.data?.summary || responseData?.data?.counts || {};
    
    const totalRegions = summary.total_regions ?? regions.length;
    const totalBookings = summary.total_bookings ?? regions.reduce((acc, r) => acc + (r.bookings_count || 0), 0);
    const totalWorkers = summary.total_workers ?? regions.reduce((acc, r) => acc + (r.workers_count || 0), 0);
    const readyBatchesCount = regions.filter((r) => r.prep_status === 'ready_for_transport').length;

    const statusBadge = (status) => {
        switch (status) {
            case 'ready_for_transport':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {isArabic ? 'جاهزة للنقل' : 'Ready for Transport'}
                    </span>
                );
            case 'partially_prepared':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        {isArabic ? 'مجهزة جزئياً' : 'Partially Prepared'}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                        {isArabic ? 'غير مجهزة' : 'Not Prepared'}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6 font-main w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'إدارة نقل وتوزيع العاملات' : 'Worker Transport & Dispatching'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'عرض التوزيع التشغيلي اليومي وتحديد نقاط وانطلاق مجموعات التوصيل.' : 'Daily operational dispatch grouping by region and start times.'}
                    </p>
                </div>
            </div>

            {/* Unified KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Card 1: Active Regions */}
                <button
                    type="button"
                    onClick={() => setSelectedStatus('')}
                    className={`bg-white p-3.5 sm:p-4.5 rounded-2xl border text-start transition-all duration-200 flex items-center justify-between gap-3 group cursor-pointer outline-none ${
                        !selectedStatus
                            ? 'border-[#E91E63] ring-2 ring-[#E91E63]/20 shadow-md'
                            : 'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
                    }`}
                >
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider truncate">
                            {isArabic ? 'المناطق التشغيلية اليوم' : 'Active Regions'}
                        </p>
                        <p className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
                            {totalRegions}
                        </p>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5 truncate">
                            {isArabic ? 'مناطق مخدومة بالتوصيل' : 'Covered zones today'}
                        </p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                    </div>
                </button>

                {/* Card 2: Confirmed Bookings */}
                <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 flex items-center justify-between gap-3 group">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider truncate">
                            {isArabic ? 'الحجوزات المطلوبة للنقل' : 'Bookings to Dispatch'}
                        </p>
                        <p className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
                            {totalBookings}
                        </p>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5 truncate">
                            {isArabic ? 'حجوزات نشطة ومؤكدة' : 'Confirmed bookings'}
                        </p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                    </div>
                </div>

                {/* Card 3: Workers Count */}
                <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 flex items-center justify-between gap-3 group">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider truncate">
                            {isArabic ? 'إجمالي العاملات المنقولات' : 'Workers to Transport'}
                        </p>
                        <p className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
                            {totalWorkers}
                        </p>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5 truncate">
                            {isArabic ? 'عاملات محددات للشفتات' : 'Assigned shift workers'}
                        </p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                    </div>
                </div>

                {/* Card 4: Ready for Transport */}
                <button
                    type="button"
                    onClick={() => setSelectedStatus(selectedStatus === 'ready_for_transport' ? '' : 'ready_for_transport')}
                    className={`bg-white p-3.5 sm:p-4.5 rounded-2xl border text-start transition-all duration-200 flex items-center justify-between gap-3 group cursor-pointer outline-none ${
                        selectedStatus === 'ready_for_transport'
                            ? 'border-[#E91E63] ring-2 ring-[#E91E63]/20 shadow-md'
                            : 'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
                    }`}
                >
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider truncate">
                            {isArabic ? 'المناطق الجاهزة للنقل' : 'Ready for Transport'}
                        </p>
                        <p className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
                            {readyBatchesCount}
                        </p>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5 truncate">
                            {isArabic ? 'مجموعات مكتملة الانطلاق' : 'Batches ready to depart'}
                        </p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75a1.125 1.125 0 00-1.125-1.125H3.375A1.125 1.125 0 002.25 3.75v10.5m12-6.75h4.125c.621 0 1.125.504 1.125 1.125v4.5m-5.25-5.625v5.625" />
                        </svg>
                    </div>
                </button>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">{isArabic ? 'تاريخ الخدمة' : 'Service Date'}</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                    />
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">{isArabic ? 'المحافظة' : 'Governorate'}</label>
                    <select
                        value={selectedGovernorate}
                        onChange={(e) => setSelectedGovernorate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none bg-white font-medium"
                    >
                        <option value="">{isArabic ? 'جميع المحافظات' : 'All Governorates'}</option>
                        {['القاهرة', 'الجيزة', 'الإسكندرية', 'عمان', 'الشرقية', 'الدقهلية', 'القليوبية'].map((gov) => (
                            <option key={gov} value={gov}>{gov}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">{isArabic ? 'حالة تجهيز النقل' : 'Preparation Status'}</label>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none bg-white"
                    >
                        <option value="">{isArabic ? 'جميع حالات التجهيز' : 'All Preparation Statuses'}</option>
                        <option value="ready_for_transport">{isArabic ? 'جاهزة للنقل' : 'Ready for Transport'}</option>
                        <option value="partially_prepared">{isArabic ? 'مجهزة جزئياً' : 'Partially Prepared'}</option>
                        <option value="not_prepared">{isArabic ? 'غير مجهزة' : 'Not Prepared'}</option>
                    </select>
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">{isArabic ? 'وقت البدء' : 'Start Time'}</label>
                    <input
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                    />
                </div>
            </div>

            {/* Regions List / Batches Grid */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-extrabold text-gray-900">
                        {isArabic ? 'توزيع شفتات المناطق اليومية' : 'Daily Region Shift Batches'}
                    </h2>
                    <span className="text-xs font-bold text-gray-400">
                        {regions.length} {isArabic ? 'منطقة محددة' : 'Regions found'}
                    </span>
                </div>

                <div className="divide-y divide-gray-100">
                    {isLoading ? (
                        <div className="p-12  text-gray-400 font-bold">
                            <div className="flex justify-center items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                <span>{isArabic ? 'جاري تحميل جدول التوزيع...' : 'Loading dispatch schedule...'}</span>
                            </div>
                        </div>
                    ) : isError ? (
                        <div className="p-8  text-rose-500 font-bold">{error.message}</div>
                    ) : regions.length === 0 ? (
                        <div className="p-12  text-gray-400 font-bold">
                            {isArabic ? 'لا توجد شفتات توصيل أو حجوزات نشطة بهذا التاريخ.' : 'No dispatch batches found for selected date.'}
                        </div>
                    ) : (
                        regions.map((item, idx) => {
                            const govDisplay = typeof item.governorate === 'object' ? (item.governorate?.name_ar || item.governorate?.name_en || item.governorate?.name || 'القاهرة') : String(item.governorate || '—');
                            const areaDisplay = typeof item.area === 'object' ? (item.area?.name_ar || item.area?.name_en || item.area?.name || 'منطقة مخدومة') : String(item.area || '—');

                            return (
                                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-pink-50 text-[#E91E63] flex items-center justify-center shrink-0">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="font-extrabold text-sm text-gray-900">
                                                {govDisplay} — {areaDisplay}
                                            </h3>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-0.5">
                                            <span className="inline-flex items-center gap-1">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'الحجوزات:' : 'Bookings:'}</span>
                                                <strong className="text-gray-800">{item.bookings_count}</strong>
                                            </span>
                                            <span>•</span>
                                            <span className="inline-flex items-center gap-1">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'العاملات:' : 'Workers:'}</span>
                                                <strong className="text-gray-800">{item.workers_count}</strong>
                                            </span>
                                            <span>•</span>
                                            <span className="inline-flex items-center gap-1">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'أول شفت:' : 'Earliest:'}</span>
                                                <strong className="text-gray-800 font-mono">{format12Hour(item.earliest_start_time)}</strong>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 self-end sm:self-auto">
                                        {statusBadge(item.prep_status)}

                                        <button
                                            onClick={() => navigate(`/transport-dispatch/details?date=${selectedDate}&governorate=${encodeURIComponent(govDisplay)}&area=${encodeURIComponent(areaDisplay)}`)}
                                            className="px-4 py-2 bg-[#E91E63] text-white rounded-xl text-xs font-bold hover:bg-[#D81B60] transition shadow-sm flex items-center gap-1.5 shrink-0"
                                        >
                                            <span>{isArabic ? 'عرض وتحديد التوزيع' : 'Setup Dispatch'}</span>
                                            <svg className="w-3.5 h-3.5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
