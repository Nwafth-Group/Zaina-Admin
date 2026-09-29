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
        queryKey: ['transport-dispatch-shifts-overview', queryString],
        queryFn: async () => (await axiosInstance.get(`/admin/transport-dispatch/shifts-overview?${queryString}`)).data,
    });

    const shifts = responseData?.data?.shifts || [];
    const summary = responseData?.data?.summary || {};

    const totalShifts = summary.total_shifts ?? shifts.length;
    const totalBookings = summary.total_bookings ?? shifts.reduce((acc, s) => acc + (s.bookings_count || 0), 0);
    const totalWorkers = summary.total_workers ?? shifts.reduce((acc, s) => acc + (s.workers_count || 0), 0);
    const assignedWorkers = summary.assigned_workers ?? shifts.reduce((acc, s) => acc + (s.assigned_workers_count || 0), 0);
    const unassignedWorkers = summary.unassigned_workers ?? Math.max(0, totalWorkers - assignedWorkers);

    const statusBadge = (status) => {
        switch (status) {
            case 'ready_for_transport':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {isArabic ? 'جاهز للنقل' : 'Ready for Transport'}
                    </span>
                );
            case 'partially_prepared':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        {isArabic ? 'مجهز جزئياً' : 'Partially Prepared'}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                        {isArabic ? 'غير مجهز' : 'Not Prepared'}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6 font-main w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full bg-[#E91E63]" />
                        {isArabic ? 'إدارة نقل وترحيل العاملات (حسب الشفتات)' : 'Shift-Based Transport & Dispatching'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic
                            ? 'توزيع عمالة الشفتات اليومية فردياً على السائقين مع متابعة سعة المركبات وإصدار كشوفات التوصيل.'
                            : 'Daily shift transport distribution, worker-by-worker driver assignment and vehicle manifests.'}
                    </p>
                </div>
            </div>

            {/* Unified KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Card 1: Active Shifts */}
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
                            {isArabic ? 'شفتات اليوم النشطة' : 'Active Shifts Today'}
                        </p>
                        <p className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
                            {totalShifts}
                        </p>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5 truncate">
                            {isArabic ? 'مواعيد بدء الحجوزات' : 'Scheduled shift times'}
                        </p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </button>

                {/* Card 2: Bookings to Dispatch */}
                <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 flex items-center justify-between gap-3 group">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider truncate">
                            {isArabic ? 'الحجوزات المجدولة' : 'Bookings to Dispatch'}
                        </p>
                        <p className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
                            {totalBookings}
                        </p>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5 truncate">
                            {isArabic ? 'حجوزات مؤكدة بحاجة لنقل' : 'Confirmed bookings'}
                        </p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                    </div>
                </div>

                {/* Card 3: Workers Assigned */}
                <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 flex items-center justify-between gap-3 group">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider truncate">
                            {isArabic ? 'العاملات المعينات لسائق' : 'Assigned to Drivers'}
                        </p>
                        <p className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
                            {assignedWorkers} <span className="text-sm font-semibold text-gray-400">/ {totalWorkers}</span>
                        </p>
                        <p className="text-[11px] font-bold text-emerald-600 mt-0.5 truncate">
                            {totalWorkers > 0 ? Math.round((assignedWorkers / totalWorkers) * 100) : 0}% {isArabic ? 'تم ترحيلهن' : 'dispatched'}
                        </p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                    </div>
                </div>

                {/* Card 4: Unassigned / Pending */}
                <button
                    type="button"
                    onClick={() => setSelectedStatus(selectedStatus === 'not_prepared' ? '' : 'not_prepared')}
                    className={`bg-white p-3.5 sm:p-4.5 rounded-2xl border text-start transition-all duration-200 flex items-center justify-between gap-3 group cursor-pointer outline-none ${
                        selectedStatus === 'not_prepared'
                            ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                            : 'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
                    }`}
                >
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider truncate">
                            {isArabic ? 'عاملات بانتظار سائق' : 'Awaiting Driver'}
                        </p>
                        <p className="text-2xl font-black text-amber-600 mt-1 tracking-tight">
                            {unassignedWorkers}
                        </p>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5 truncate">
                            {isArabic ? 'بحاجة للتعيين الميداني' : 'Pending assignment'}
                        </p>
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
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
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none font-medium"
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
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">{isArabic ? 'حالة التجهيز' : 'Status'}</label>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none bg-white font-medium"
                    >
                        <option value="">{isArabic ? 'جميع حالات التجهيز' : 'All Preparation Statuses'}</option>
                        <option value="ready_for_transport">{isArabic ? 'جاهز للنقل' : 'Ready for Transport'}</option>
                        <option value="partially_prepared">{isArabic ? 'مجهز جزئياً' : 'Partially Prepared'}</option>
                        <option value="not_prepared">{isArabic ? 'غير مجهز' : 'Not Prepared'}</option>
                    </select>
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">{isArabic ? 'ساعة بدء الشفت' : 'Shift Hour'}</label>
                    <select
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none bg-white font-medium"
                    >
                        <option value="">{isArabic ? 'جميع الساعات / الشفتات' : 'All Shift Hours'}</option>
                        {Array.from({ length: 17 }, (_, i) => {
                            const hourNum = i + 6; // from 06:00 to 22:00
                            const hourStr = String(hourNum).padStart(2, '0') + ':00';
                            const display12 = format12Hour(hourStr);
                            return (
                                <option key={hourStr} value={hourStr}>
                                    {display12} ({hourStr})
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>

            {/* Shifts Batches List */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {isArabic ? 'قائمة الشفتات اليومية للنقل والترحيل' : 'Daily Shift Transport List'}
                    </h2>
                    <span className="text-xs font-bold text-gray-400">
                        {shifts.length} {isArabic ? 'شفتات مجدولة' : 'Shifts scheduled'}
                    </span>
                </div>

                <div className="divide-y divide-gray-100">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-400 font-bold">
                            <div className="flex justify-center items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" />
                                </svg>
                                <span>{isArabic ? 'جاري تحميل جدول الشفتات...' : 'Loading shift batches...'}</span>
                            </div>
                        </div>
                    ) : isError ? (
                        <div className="p-8 text-center text-rose-500 font-bold">{error.message}</div>
                    ) : shifts.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 font-bold">
                            {isArabic ? 'لا توجد شفتات نشطة أو حجوزات مسجلة لهذا التاريخ.' : 'No active shifts or bookings found for this date.'}
                        </div>
                    ) : (
                        shifts.map((shift, idx) => {
                            const percent = shift.workers_count > 0 ? Math.round((shift.assigned_workers_count / shift.workers_count) * 100) : 0;

                            return (
                                <div key={idx} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex flex-wrap items-center gap-3">
                                            {/* Shift Time Badge */}
                                            <div className="px-3.5 py-1.5 rounded-xl bg-pink-50 border border-pink-100 text-[#E91E63] font-black text-sm tracking-wide font-mono flex items-center gap-1.5 shadow-sm">
                                                <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>{format12Hour(shift.start_time)}</span>
                                            </div>

                                            {/* Preparation Badge */}
                                            {statusBadge(shift.status)}

                                            {/* Drivers count */}
                                            {shift.drivers_count > 0 && (
                                                <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                                                    🚐 {shift.drivers_count} {isArabic ? 'سائقين معينين' : 'drivers assigned'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Counters */}
                                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-1">
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'الحجوزات:' : 'Bookings:'}</span>
                                                <strong className="text-gray-900 font-bold">{shift.bookings_count}</strong>
                                            </span>
                                            <span>•</span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'العاملات:' : 'Workers:'}</span>
                                                <strong className="text-gray-900 font-bold">{shift.workers_count}</strong>
                                            </span>
                                            <span>•</span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'تم التعيين لسائق:' : 'Assigned:'}</span>
                                                <strong className="text-emerald-700 font-bold">{shift.assigned_workers_count}</strong>
                                            </span>
                                            <span>•</span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'المتبقي بدون سائق:' : 'Unassigned:'}</span>
                                                <strong className={shift.unassigned_workers_count > 0 ? 'text-amber-600 font-bold' : 'text-gray-500'}>
                                                    {shift.unassigned_workers_count}
                                                </strong>
                                            </span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full max-w-md pt-1">
                                            <div className="flex justify-between text-[11px] text-gray-400 font-bold mb-1">
                                                <span>{isArabic ? 'نسبة جاهزية الترحيل' : 'Dispatch Readiness'}</span>
                                                <span>{percent}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-2 rounded-full transition-all duration-300 ${
                                                        percent === 100 ? 'bg-emerald-500' : percent > 0 ? 'bg-[#E91E63]' : 'bg-gray-300'
                                                    }`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                        <button
                                            onClick={() => navigate(`/transport-dispatch/details?date=${selectedDate}&shift=${encodeURIComponent(shift.start_time)}`)}
                                            className="group p-4 inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-[#E91E63] text-white text-xs font-bold shadow-xs hover:bg-[#D81B60] hover:shadow-md hover:shadow-pink-500/20 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                                        >
                                            <span>{isArabic ? 'إدارة الشفت' : 'Manage Shift'}</span>
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
