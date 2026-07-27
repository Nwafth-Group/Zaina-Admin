import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios.js';

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

            {/* Premium KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Active Regions */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
                    <div>
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                            {isArabic ? 'المناطق التشغيلية اليوم' : 'Active Regions'}
                        </p>
                        <p className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
                            {totalRegions}
                        </p>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                            {isArabic ? 'مناطق مخدومة بالتوصيل' : 'Covered zones today'}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform">
                        🗺️
                    </div>
                </div>

                {/* Card 2: Confirmed Bookings */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
                    <div>
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                            {isArabic ? 'الحجوزات المطلوبة للنقل' : 'Bookings to Dispatch'}
                        </p>
                        <p className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
                            {totalBookings}
                        </p>
                        <p className="text-[11px] font-bold text-emerald-600 mt-0.5">
                            ✓ {isArabic ? 'حجوزات نشطة ومأكّدة' : 'Confirmed bookings'}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform">
                        📦
                    </div>
                </div>

                {/* Card 3: Workers Count */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
                    <div>
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                            {isArabic ? 'إجمالي العاملات المنقولات' : 'Workers to Transport'}
                        </p>
                        <p className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
                            {totalWorkers}
                        </p>
                        <p className="text-[11px] font-bold text-indigo-600 mt-0.5">
                            👩‍🍳 {isArabic ? 'عاملات محددات للشفتات' : 'Assigned workers'}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform">
                        🚌
                    </div>
                </div>

                {/* Card 4: Selected Date */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between group">
                    <div>
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                            {isArabic ? 'تاريخ تشغيل النقل' : 'Service Date'}
                        </p>
                        <p className="text-base font-black text-gray-900 mt-1.5 font-mono">
                            {selectedDate}
                        </p>
                        <p className="text-[11px] font-bold text-blue-600 mt-0.5">
                            📅 {isArabic ? 'جدول توزيع اليوم' : 'Active dispatch date'}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform">
                        ⏱️
                    </div>
                </div>
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
                                            <span className="text-base">🗺️</span>
                                            <h3 className="font-extrabold text-sm text-gray-900">
                                                {govDisplay} — {areaDisplay}
                                            </h3>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-0.5">
                                            <span>
                                                📦 <strong className="text-gray-700">{item.bookings_count}</strong> {isArabic ? 'حجوزات' : 'Bookings'}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                👩‍🍳 <strong className="text-gray-700">{item.workers_count}</strong> {isArabic ? 'عاملات' : 'Workers'}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                ⏱️ {isArabic ? 'أول شفت يبدأ:' : 'Earliest Start:'} <strong className="text-gray-800 font-mono">{item.earliest_start_time}</strong>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 self-end sm:self-auto">
                                        {statusBadge(item.prep_status)}

                                        <button
                                            onClick={() => navigate(`/transport-dispatch/details?date=${selectedDate}&governorate=${encodeURIComponent(govDisplay)}&area=${encodeURIComponent(areaDisplay)}`)}
                                            className="px-4 py-2 bg-[#E91E63] text-white rounded-xl text-xs font-bold hover:bg-[#D81B60] transition shadow-2xs flex items-center gap-1.5 shrink-0"
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
