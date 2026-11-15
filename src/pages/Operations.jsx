import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../api/axios.js';

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

export default function Operations() {
    const navigate = useNavigate();
    const { i18n } = useTranslation('common');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    // View Navigation: 'operations' (Bookings Schedule) | 'staff' (All Workers & Absences)
    const [activeTab, setActiveTab] = useState('operations');

    // Flow Explanation Modal
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    // Selected Date (YYYY-MM-DD)
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [riskOnly, setRiskOnly] = useState(false);
    const [unassignedOnly, setUnassignedOnly] = useState(false);

    // Staff Directory Filters in Tab 2
    const [workerSearch, setWorkerSearch] = useState('');
    const [workerGenderFilter, setWorkerGenderFilter] = useState('');

    // Field Execution Modals
    const [startModalBooking, setStartModalBooking] = useState(null);
    const [startTimeInput, setStartTimeInput] = useState('');

    const [completeModalBooking, setCompleteModalBooking] = useState(null);
    const [endTimeInput, setEndTimeInput] = useState('');

    const [riskModalBooking, setRiskModalBooking] = useState(null);
    const [alternativesBooking, setAlternativesBooking] = useState(null);

    // Absence Modal
    const [absenceModalOpen, setAbsenceModalOpen] = useState(false);
    const [absenceForm, setAbsenceForm] = useState({
        worker_id: '',
        absence_start: '',
        absence_end: '',
        reason: '',
        notes: '',
    });

    const [timelineWorkerId, setTimelineWorkerId] = useState(null);

    // 1. Fetch Operations Dashboard Bookings & Metrics
    const { data: dashboardResponse, isLoading: isLoadingDashboard, isFetching, refetch } = useQuery({
        queryKey: ['daily-operations', selectedDate, search, statusFilter, riskOnly],
        queryFn: async () => {
            const params = new URLSearchParams({ date: selectedDate });
            if (search) params.append('search', search);
            if (statusFilter) params.append('status', statusFilter);
            if (riskOnly) params.append('is_at_risk', 'true');
            return (await axiosInstance.get(`/admin/operations/daily-dashboard?${params.toString()}`)).data;
        },
        refetchInterval: 30000,
    });

    // 2. Fetch All Workers List (for Staff Directory & Dropdowns)
    const { data: workersResponse, isLoading: isLoadingWorkers } = useQuery({
        queryKey: ['workers-lookup-operations'],
        queryFn: async () => (await axiosInstance.get('/admin/workers?per_page=150')).data,
    });

    const workersList = workersResponse?.data?.items || workersResponse?.data || [];

    // 3. Fetch Worker Absences Log
    const { data: absencesResponse, isLoading: isLoadingAbsences } = useQuery({
        queryKey: ['worker-absences-list'],
        queryFn: async () => (await axiosInstance.get('/admin/operations/absences')).data,
    });

    const absencesList = absencesResponse?.data || [];

    // 4. Fetch Alternatives for At-Risk Booking
    const { data: alternativesData, isLoading: isLoadingAlternatives } = useQuery({
        queryKey: ['booking-alternatives', alternativesBooking?.id],
        queryFn: async () => (await axiosInstance.get(`/admin/operations/bookings/${alternativesBooking.id}/alternatives`)).data,
        enabled: Boolean(alternativesBooking?.id),
    });

    // 5. Fetch Worker Timeline
    const { data: timelineData, isLoading: isLoadingTimeline } = useQuery({
        queryKey: ['worker-timeline', timelineWorkerId, selectedDate],
        queryFn: async () => (await axiosInstance.get(`/admin/operations/worker-timeline?worker_id=${timelineWorkerId}&date=${selectedDate}`)).data,
        enabled: Boolean(timelineWorkerId),
    });

    const dashboardData = dashboardResponse?.data || { metrics: {}, bookings: [] };
    const metrics = dashboardData.metrics || {};
    const rawBookings = dashboardData.bookings || [];

    const bookings = useMemo(() => {
        if (unassignedOnly) {
            return rawBookings.filter((b) => !b.team && !b.worker);
        }
        return rawBookings;
    }, [rawBookings, unassignedOnly]);

    const filteredWorkers = useMemo(() => {
        return workersList.filter((w) => {
            const matchesSearch = !workerSearch || 
                w.name?.toLowerCase().includes(workerSearch.toLowerCase()) ||
                w.phone_number?.includes(workerSearch) ||
                w.nationality?.toLowerCase().includes(workerSearch.toLowerCase());
            const matchesGender = !workerGenderFilter || w.gender === workerGenderFilter;
            return matchesSearch && matchesGender;
        });
    }, [workersList, workerSearch, workerGenderFilter]);

    // Mutation: Start Service
    const startServiceMutation = useMutation({
        mutationFn: async ({ bookingId, actual_start_time }) => {
            return (await axiosInstance.post(`/admin/operations/bookings/${bookingId}/start`, {
                actual_start_time,
                date: selectedDate,
            })).data;
        },
        onSuccess: (res) => {
            toast.success(res?.message || (isArabic ? 'تم تسجيل بدء الخدمة بنجاح' : 'Service started successfully'));
            queryClient.invalidateQueries({ queryKey: ['daily-operations'] });
            setStartModalBooking(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'حدث خطأ أثناء تسجيل بدء الخدمة' : 'Error starting service'));
        },
    });

    // Mutation: Update Times & Complete Service (Both start & end on same day)
    const completeServiceMutation = useMutation({
        mutationFn: async ({ bookingId, actual_start_time, actual_end_time }) => {
            return (await axiosInstance.post(`/admin/operations/bookings/${bookingId}/update-times`, {
                actual_start_time,
                actual_end_time,
                date: selectedDate,
            })).data;
        },
        onSuccess: (res) => {
            toast.success(res?.message || (isArabic ? 'تم تحديث أوقات الخدمة وإنهائها بنجاح' : 'Service times updated and completed successfully'));
            queryClient.invalidateQueries({ queryKey: ['daily-operations'] });
            setCompleteModalBooking(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'حدث خطأ أثناء حفظ أوقات الخدمة' : 'Error updating service times'));
        },
    });

    // Mutation: Assign Alternative Candidate
    const resolveRiskMutation = useMutation({
        mutationFn: async ({ bookingId, candidate_type, candidate_id }) => {
            return (await axiosInstance.post(`/admin/operations/bookings/${bookingId}/resolve-risk`, {
                candidate_type,
                candidate_id,
                resolution_action: 'assign_alternative',
            })).data;
        },
        onSuccess: (res) => {
            toast.success(res?.message || (isArabic ? 'تم تعيين البديل بنجاح' : 'Alternative assigned successfully'));
            queryClient.invalidateQueries({ queryKey: ['daily-operations'] });
            setAlternativesBooking(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'حدث خطأ أثناء تعيين البديل' : 'Error assigning alternative'));
        },
    });

    // Mutation: Record Absence
    const recordAbsenceMutation = useMutation({
        mutationFn: async (payload) => {
            return (await axiosInstance.post('/admin/operations/absences', payload)).data;
        },
        onSuccess: (res) => {
            toast.success(res?.message || (isArabic ? 'تم تسجيل غياب العامل وتحديث المخاطر' : 'Worker absence recorded'));
            queryClient.invalidateQueries({ queryKey: ['daily-operations'] });
            queryClient.invalidateQueries({ queryKey: ['worker-absences-list'] });
            setAbsenceModalOpen(false);
            setAbsenceForm({
                worker_id: '',
                absence_start: '',
                absence_end: '',
                reason: '',
                notes: '',
            });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'حدث خطأ أثناء تسجيل الغياب' : 'Error recording absence'));
        },
    });

    // Mutation: Resolve Absence
    const resolveAbsenceMutation = useMutation({
        mutationFn: async (absenceId) => {
            return (await axiosInstance.post(`/admin/operations/absences/${absenceId}/resolve`, {
                resolution_notes: 'Resolved via operations portal',
            })).data;
        },
        onSuccess: (res) => {
            toast.success(res?.message || (isArabic ? 'تم إغلاق ومعالجة حالة الغياب بنجاح' : 'Absence resolved successfully'));
            queryClient.invalidateQueries({ queryKey: ['worker-absences-list'] });
            queryClient.invalidateQueries({ queryKey: ['daily-operations'] });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'حدث خطأ أثناء معالجة الغياب' : 'Error resolving absence'));
        },
    });

    const openStartModal = (booking) => {
        if (!booking.transport?.driver_name) {
            toast.error(isArabic ? 'لا يمكن بدء الخدمة قبل تعيين سائق لنقل العاملات في قسم الترحيل والنقل.' : 'Cannot start service until a driver is assigned for transport.');
            return;
        }
        setStartModalBooking(booking);
        const nowTime = new Date().toTimeString().substring(0, 5);
        setStartTimeInput(nowTime);
    };

    const openCompleteModal = (booking) => {
        if (!booking.transport?.driver_name) {
            toast.error(isArabic ? 'لا يمكن إنهاء الخدمة قبل تعيين سائق لنقل العاملات في قسم الترحيل والنقل.' : 'Cannot complete service until a driver is assigned for transport.');
            return;
        }
        setCompleteModalBooking(booking);
        const existingStart = booking.actual_start_time || booking.planned_start_time || '08:00';
        setStartTimeInput(existingStart.length >= 5 ? existingStart.substring(0, 5) : '08:00');
        const nowTime = new Date().toTimeString().substring(0, 5);
        setEndTimeInput(nowTime);
    };

    const openAbsenceModalForWorker = (worker) => {
        setAbsenceForm({
            worker_id: String(worker.id),
            absence_start: `${todayStr}T08:00`,
            absence_end: `${todayStr}T18:00`,
            reason: '',
            notes: '',
        });
        setAbsenceModalOpen(true);
    };

    // Metric KPI Cards matching TransportDispatch layout (NO EMOJIS, NO "LIVE" WORD)
    const metricCards = [
        {
            key: 'total',
            label: isArabic ? 'إجمالي الحجوزات اليوم' : 'Total Bookings Today',
            count: metrics.total_bookings ?? 0,
            sub: isArabic ? 'حجوزات مجدولة للتشغيل' : 'Scheduled operations',
            gradient: 'from-pink-500 to-rose-600',
            active: !statusFilter && !riskOnly && !unassignedOnly,
            icon: (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
            ),
            onClick: () => {
                setStatusFilter('');
                setRiskOnly(false);
                setUnassignedOnly(false);
            },
        },
        {
            key: 'inService',
            label: isArabic ? 'قيد التنفيذ الميداني' : 'In Service',
            count: metrics.in_service ?? 0,
            sub: isArabic ? 'فرق وعمال في المواقع' : 'Teams on-site',
            gradient: 'from-amber-400 to-amber-600',
            active: statusFilter === 'inService',
            icon: (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
            ),
            onClick: () => {
                setStatusFilter('inService');
                setRiskOnly(false);
                setUnassignedOnly(false);
            },
        },
        {
            key: 'at_risk',
            label: isArabic ? 'معرضة للخطر (At-Risk)' : 'At-Risk Delays',
            count: metrics.at_risk ?? 0,
            sub: isArabic ? 'نقص في فاصل الـ 60 دقيقة' : 'Transition gap deficit',
            gradient: 'from-rose-500 to-red-600',
            active: riskOnly,
            icon: (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
            ),
            onClick: () => {
                setRiskOnly(!riskOnly);
                setStatusFilter('');
                setUnassignedOnly(false);
            },
        },
        {
            key: 'completed',
            label: isArabic ? 'حجوزات مكتملة' : 'Completed Bookings',
            count: metrics.completed ?? 0,
            sub: isArabic ? 'خدمات أُنجزت بنجاح' : 'Finished successfully',
            gradient: 'from-emerald-400 to-teal-600',
            active: statusFilter === 'completed',
            icon: (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            onClick: () => {
                setStatusFilter('completed');
                setRiskOnly(false);
                setUnassignedOnly(false);
            },
        },
    ];

    return (
        <div className="space-y-6 font-main w-full pb-16">
            {/* Page Header with '!' icon button behind the title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <span>{isArabic ? 'إدارة العمليات الميدانية' : 'Field Operations Management'}</span>
                        
                        {/* The '!' Information Button */}
                        <button
                            type="button"
                            onClick={() => setIsInfoModalOpen(true)}
                            title={isArabic ? 'شرح تدفق وتكامل دورة العمليات' : 'Explain Operations Modules Flow'}
                            className="w-6 h-6 rounded-full bg-rose-50 text-[#E91E63] hover:bg-rose-100 hover:scale-105 border border-rose-200 flex items-center justify-center transition-all shadow-2xs font-black text-xs cursor-pointer"
                        >
                            !
                        </button>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic
                            ? 'متابعة تنفيذ الحجوزات، انطلاق السائقين، فحص فاصل الـ 60 دقيقة الإلزامي، ورصد مخاطر التأخير (At-Risk).'
                            : 'Service execution tracking, driver dispatching, 60-min transition gap verification, and delay risk management.'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setAbsenceForm({
                                worker_id: '',
                                absence_start: `${todayStr}T08:00`,
                                absence_end: `${todayStr}T18:00`,
                                reason: '',
                                notes: '',
                            });
                            setAbsenceModalOpen(true);
                        }}
                        className="bg-[#E91E63] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#D81B60] transition shadow-2xs flex items-center gap-1.5 shrink-0 outline-none"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{isArabic ? 'تسجيل غياب عامل' : 'Log Worker Absence'}</span>
                    </button>
                </div>
            </div>

            {/* Premium Metric KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {metricCards.map((card) => (
                    <button
                        key={card.key}
                        type="button"
                        onClick={card.onClick}
                        className={`bg-white p-3.5 sm:p-4.5 rounded-2xl border text-start transition-all duration-200 flex items-center justify-between gap-3 group cursor-pointer outline-none ${
                            card.active
                                ? 'border-[#E91E63] ring-2 ring-[#E91E63]/20 shadow-md'
                                : 'border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
                        }`}
                    >
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider truncate">
                                {card.label}
                            </p>
                            <p className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
                                {card.count}
                            </p>
                            <p className="text-[11px] font-bold text-gray-400 mt-0.5 truncate">
                                {card.sub}
                            </p>
                        </div>
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0`}>
                            {card.icon}
                        </div>
                    </button>
                ))}
            </div>

            {/* View Navigation Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex items-center gap-6">
                    <button
                        type="button"
                        onClick={() => setActiveTab('operations')}
                        className={`pb-3 text-xs font-black transition-all flex items-center gap-2 border-b-2 ${
                            activeTab === 'operations'
                                ? 'border-[#E91E63] text-[#E91E63]'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        <span>{isArabic ? 'جدول العمليات' : 'Operations Schedule'}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-700 font-bold">
                            {rawBookings.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('staff')}
                        className={`pb-3 text-xs font-black transition-all flex items-center gap-2 border-b-2 ${
                            activeTab === 'staff'
                                ? 'border-[#E91E63] text-[#E91E63]'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                        <span>{isArabic ? 'الكادر الميداني وسجل الغياب' : 'Field Staff & Absences'}</span>
                        {absencesList.filter(a => a.status === 'reported').length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                                {absencesList.filter(a => a.status === 'reported').length} {isArabic ? 'حالة غياب' : 'absent'}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* TAB 1: Operations Schedule */}
            {activeTab === 'operations' && (
                <div className="space-y-4">
                    {/* Toolbar Bar */}
                    <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        {/* Search Input */}
                        <div className="relative w-full lg:w-80">
                            <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400 pointer-events-none">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={isArabic ? 'البحث برقم الحجز، العميل، الجوال...' : 'Search booking, client, mobile...'}
                                className="w-full border border-gray-200 rounded-lg ps-9 pe-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                            />
                        </div>

                        {/* Date Controls & Refresh */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200 text-xs font-bold">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const d = new Date();
                                        d.setDate(d.getDate() - 1);
                                        setSelectedDate(d.toISOString().split('T')[0]);
                                    }}
                                    className={`px-3 py-1 rounded-lg transition ${
                                        selectedDate !== todayStr && selectedDate < todayStr
                                            ? 'bg-white text-gray-900 shadow-xs'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {isArabic ? 'أمس' : 'Yesterday'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDate(todayStr)}
                                    className={`px-3 py-1 rounded-lg transition ${
                                        selectedDate === todayStr ? 'bg-white text-[#E91E63] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {isArabic ? 'اليوم' : 'Today'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const d = new Date();
                                        d.setDate(d.getDate() + 1);
                                        setSelectedDate(d.toISOString().split('T')[0]);
                                    }}
                                    className={`px-3 py-1 rounded-lg transition ${
                                        selectedDate > todayStr ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {isArabic ? 'غداً' : 'Tomorrow'}
                                </button>
                            </div>

                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-gray-800 bg-white focus:ring-1 focus:ring-[#E91E63] outline-none"
                            />

                            <button
                                type="button"
                                onClick={() => refetch()}
                                disabled={isFetching}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                            >
                                <svg className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#E91E63]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                                <span>{isArabic ? 'تحديث' : 'Refresh'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Master Operations Table */}
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="py-3.5 px-4 text-start">#</th>
                                        <th className="py-3.5 px-4 text-start">{isArabic ? 'الحجز والعميل' : 'Booking & Client'}</th>
                                        <th className="py-3.5 px-4 text-start">{isArabic ? 'الخدمة والموقع' : 'Service & Zone'}</th>
                                        <th className="py-3.5 px-4 text-start">{isArabic ? 'المورد المعين' : 'Assigned Resource'}</th>
                                        <th className="py-3.5 px-4 text-start">{isArabic ? 'سائق النقل' : 'Transport Driver'}</th>
                                        <th className="py-3.5 px-4 text-start">{isArabic ? 'التوقيت المخطط والفعلي' : 'Planned vs Actual Timing'}</th>
                                        <th className="py-3.5 px-4 text-start">{isArabic ? 'الحالة والمخاطر' : 'Status & Risk'}</th>
                                        <th className="py-3.5 px-4 text-center">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs">
                                    {isLoadingDashboard ? (
                                        <tr>
                                            <td colSpan="8" className="py-12 text-center text-gray-400 font-bold">
                                                <div className="flex justify-center items-center gap-2">
                                                    <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                                                    </svg>
                                                    <span>{isArabic ? 'جاري التحميل...' : 'Loading operations...'}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : bookings.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="py-12 text-center text-gray-400 font-bold">
                                                {isArabic ? 'لا توجد عمليات مسجلة لهذا التاريخ أو الفلتر.' : 'No operations recorded for this date/filter.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        bookings.map((b, idx) => {
                                            const isTeam = b.service?.is_team_based || Boolean(b.team);
                                            return (
                                                <tr
                                                    key={b.id}
                                                    className={`transition-colors ${
                                                        b.is_at_risk
                                                            ? 'bg-rose-50/50 hover:bg-rose-50/80'
                                                            : b.status === 'inService'
                                                            ? 'bg-amber-50/30 hover:bg-amber-50/60'
                                                            : 'hover:bg-gray-50/80'
                                                    }`}
                                                >
                                                    <td className="py-3.5 px-4 font-mono font-bold text-gray-400">{idx + 1}</td>

                                                    <td className="py-3.5 px-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/bookings/${b.id}`)}
                                                            className="font-mono font-bold text-[#E91E63] hover:underline block text-start"
                                                        >
                                                            #{b.booking_ref}
                                                        </button>
                                                        <div className="font-bold text-gray-900 mt-0.5">{b.customer?.name}</div>
                                                        <div className="text-[10px] text-gray-500 font-mono" dir="ltr">
                                                            {b.customer?.mobile}
                                                        </div>
                                                    </td>

                                                    <td className="py-3.5 px-4">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-bold text-gray-800">{b.service?.name}</span>
                                                            {b.visit_label && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                                                                    {b.visit_label}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 truncate max-w-[170px]" title={b.customer?.address}>
                                                            {b.customer?.address || (isArabic ? 'موقع العميل' : 'Customer address')}
                                                        </div>
                                                        {b.customer?.service_zone && (
                                                            <div className="text-[10px] text-gray-400 font-bold mt-0.5">
                                                                {b.customer?.service_zone}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="py-3.5 px-4">
                                                        {isTeam ? (
                                                            b.team ? (
                                                                <div className="space-y-0.5">
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                                        {b.team.name}
                                                                    </span>
                                                                    <div className="text-[10px] text-gray-500">
                                                                        {b.team.members?.map((m) => m.name).join(' • ') || (isArabic ? 'طاقم 3 أفراد' : '3-Crew')}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                                                                    {isArabic ? 'بانتظار تعيين فريق' : 'Team Unassigned'}
                                                                </span>
                                                            )
                                                        ) : (() => {
                                                            const assignedWorkers = (b.crew && b.crew.length > 0)
                                                                ? b.crew
                                                                : (b.workers && b.workers.length > 0
                                                                    ? b.workers
                                                                    : (b.worker ? [b.worker] : []));
                                                            const requiredCount = b.service?.required_workers || 1;

                                                            if (assignedWorkers.length === 0) {
                                                                return (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                                                        {isArabic ? 'غير معيّن' : 'Unassigned'}
                                                                    </span>
                                                                );
                                                            }

                                                            return (
                                                                <div className="space-y-1.5 min-w-[150px]">
                                                                    {assignedWorkers.map((w, wIdx) => (
                                                                        <div key={w.id || wIdx} className="flex items-center justify-between gap-2 p-1 rounded-lg bg-gray-50/80 hover:bg-gray-50 border border-gray-100 transition-colors">
                                                                            <div className="font-bold text-gray-800 flex items-center gap-1.5 min-w-0">
                                                                                <span className="w-5 h-5 rounded-full bg-rose-50 text-[#E91E63] font-bold text-[9px] flex items-center justify-center border border-rose-100 shrink-0">
                                                                                    {w.name?.charAt(0) || 'W'}
                                                                                </span>
                                                                                <span className="truncate text-xs font-bold text-gray-900">{w.name}</span>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setTimelineWorkerId(w.id)}
                                                                                className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-bold whitespace-nowrap shrink-0"
                                                                                title={isArabic ? 'عرض جدول العامل' : 'View Timeline'}
                                                                            >
                                                                                {isArabic ? 'الجدول' : 'Timeline'}
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    {requiredCount > assignedWorkers.length && (
                                                                        <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 mt-1">
                                                                            {isArabic
                                                                                ? `⚠️ تم تعيين ${assignedWorkers.length} من أصل ${requiredCount} عمال`
                                                                                : `⚠️ ${assignedWorkers.length} of ${requiredCount} assigned`}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>

                                                    <td className="py-3.5 px-4">
                                                        {b.transport ? (
                                                            <div className="space-y-0.5">
                                                                <div className="font-bold text-gray-800 flex items-center gap-1">
                                                                    <span>🚐</span>
                                                                    <span>{b.transport.driver_name || (isArabic ? 'سائق غير محدد' : 'No driver')}</span>
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 font-mono">
                                                                    {b.transport.vehicle_type || 'Van'} [{b.transport.vehicle_plate || '—'}]
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => navigate(`/transport-dispatch/details?date=${selectedDate}&shift=${encodeURIComponent(b.planned_start_time?.substring(0, 5) || '08:00')}`)}
                                                                    className="text-[10px] text-[#E91E63] hover:underline font-bold block mt-0.5 cursor-pointer"
                                                                >
                                                                    {isArabic ? 'عرض الترحيل' : 'View Dispatch'}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => navigate(`/transport-dispatch/details?date=${selectedDate}&shift=${encodeURIComponent(b.planned_start_time?.substring(0, 5) || '08:00')}`)}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-50 text-[#E91E63] hover:bg-pink-100 border border-pink-200 text-[10px] font-bold transition cursor-pointer"
                                                                >
                                                                    <span>+</span>
                                                                    <span>{isArabic ? 'تعيين سائق' : 'Assign Driver'}</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="py-3.5 px-4 font-mono">
                                                        <div className="text-[11px] font-bold text-gray-800" dir="ltr">
                                                            {format12Hour(b.planned_start_time)} - {format12Hour(b.planned_end_time)}
                                                        </div>
                                                        {(b.actual_start_time || b.actual_end_time) && (
                                                            <div className="text-[10px] text-blue-700 font-bold mt-0.5" dir="ltr">
                                                                {format12Hour(b.actual_start_time) || '—'} → {format12Hour(b.actual_end_time) || '...'}
                                                            </div>
                                                        )}
                                                        {b.started_by && (
                                                            <div className="text-[9px] text-gray-400 font-sans">
                                                                {isArabic ? `بواسطة: ${b.started_by}` : `By: ${b.started_by}`}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="py-3.5 px-4">
                                                        <div className="space-y-1">
                                                            <span
                                                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                                    b.status === 'inService'
                                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                        : b.status === 'completed'
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                        : b.status === 'cancelled'
                                                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                                                }`}
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                                    b.status === 'inService' ? 'bg-amber-500 animate-pulse' :
                                                                    b.status === 'completed' ? 'bg-emerald-500' :
                                                                    b.status === 'cancelled' ? 'bg-rose-500' : 'bg-blue-500'
                                                                }`} />
                                                                {b.status === 'inService'
                                                                    ? (isArabic ? 'قيد التنفيذ' : 'In Service')
                                                                    : b.status === 'completed'
                                                                    ? (isArabic ? 'مكتمل' : 'Completed')
                                                                    : b.status === 'cancelled'
                                                                    ? (isArabic ? 'ملغي' : 'Cancelled')
                                                                    : (isArabic ? 'مؤكد' : 'Upcoming')}
                                                            </span>

                                                            {b.is_at_risk && (
                                                                <div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setRiskModalBooking(b)}
                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black hover:bg-rose-200 transition"
                                                                    >
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                                                                        <span>{isArabic ? 'معرض للخطر (At Risk)' : 'At-Risk Alert'}</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="py-3.5 px-4 text-center">
                                                        <div className="flex flex-col gap-1 items-center justify-center">
                                                            {(() => {
                                                                const hasDriver = Boolean(b.transport?.driver_name);

                                                                return (
                                                                    <>
                                                                        {b.status !== 'inService' && b.status !== 'completed' && b.status !== 'cancelled' && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => openStartModal(b)}
                                                                                className={`w-full px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 shadow-2xs ${
                                                                                    hasDriver
                                                                                        ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                                                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed hover:bg-gray-300'
                                                                                }`}
                                                                                title={!hasDriver ? (isArabic ? 'لا يمكن بدء الخدمة قبل تعيين سائق للنقل' : 'Cannot start until driver is assigned') : ''}
                                                                            >
                                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                                                                                </svg>
                                                                                <span>{isArabic ? 'بدء الخدمة' : 'Start'}</span>
                                                                            </button>
                                                                        )}

                                                                        {b.status === 'inService' && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => openCompleteModal(b)}
                                                                                className={`w-full px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 shadow-2xs ${
                                                                                    hasDriver
                                                                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                                                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed hover:bg-gray-300'
                                                                                }`}
                                                                                title={!hasDriver ? (isArabic ? 'لا يمكن إنهاء الخدمة قبل تعيين سائق للنقل' : 'Cannot complete until driver is assigned') : ''}
                                                                            >
                                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                </svg>
                                                                                <span>{isArabic ? 'إنهاء الخدمة' : 'Complete'}</span>
                                                                            </button>
                                                                        )}

                                                                        {b.status === 'completed' && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => openCompleteModal(b)}
                                                                                className="w-full px-2 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-[9px] font-bold transition flex items-center justify-center gap-1"
                                                                                title={isArabic ? 'تعديل أوقات البدء والانتهاء معاً في نفس اليوم' : 'Edit execution times together on same day'}
                                                                            >
                                                                                <span>⏱️</span>
                                                                                <span>{isArabic ? 'تعديل التوقيت' : 'Edit Times'}</span>
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}

                                                            {(b.is_at_risk || !b.team && !b.worker) && b.status !== 'completed' && b.status !== 'cancelled' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAlternativesBooking(b)}
                                                                    className="w-full px-2.5 py-1 bg-[#E91E63] hover:bg-[#D81B60] text-white rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                                                                >
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                                                    </svg>
                                                                    <span>{isArabic ? 'اقتراح بديل' : 'Find Alternative'}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: Field Staff Directory & Absences Log */}
            {activeTab === 'staff' && (
                <div className="space-y-6">
                    {/* Section 1: Worker Absences Log */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <span>{isArabic ? 'سجل غياب العمال الميدانيين' : 'Field Worker Absences Log'}</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                                        {absencesList.length} {isArabic ? 'حالة مسجلة' : 'records'}
                                    </span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {isArabic
                                        ? 'متابعة بلاغات الغياب، التأكد من عدم تكليف العمال في فترات الغياب، ومعالجة الحالات.'
                                        : 'Track logged worker absences, prevent booking conflicts during leave, and resolve.'}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse min-w-[850px] text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                            <th className="py-3 px-4 text-start">{isArabic ? 'العامل' : 'Worker'}</th>
                                            <th className="py-3 px-4 text-start">{isArabic ? 'فترة الغياب (من - إلى)' : 'Absence Period'}</th>
                                            <th className="py-3 px-4 text-start">{isArabic ? 'السبب' : 'Reason'}</th>
                                            <th className="py-3 px-4 text-start">{isArabic ? 'سجل بواسطة' : 'Recorded By'}</th>
                                            <th className="py-3 px-4 text-start">{isArabic ? 'الحالة' : 'Status'}</th>
                                            <th className="py-3 px-4 text-center">{isArabic ? 'الإجراء' : 'Action'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {isLoadingAbsences ? (
                                            <tr>
                                                <td colSpan="6" className="py-8 text-center text-gray-400 font-bold">
                                                    {isArabic ? 'جاري تحميل سجل الغياب...' : 'Loading absences...'}
                                                </td>
                                            </tr>
                                        ) : absencesList.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="py-8 text-center text-gray-400 font-bold">
                                                    {isArabic ? 'لا توجد حالات غياب مسجلة حالياً.' : 'No worker absences recorded.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            absencesList.map((abs) => (
                                                <tr key={abs.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                                                        <span className="w-7 h-7 rounded-full bg-rose-50 text-[#E91E63] font-bold text-xs flex items-center justify-center border border-rose-100">
                                                            {abs.worker?.name?.charAt(0) || 'W'}
                                                        </span>
                                                        <div>
                                                            <div>{abs.worker?.name || `Worker #${abs.worker_id}`}</div>
                                                            <div className="text-[10px] text-gray-500 font-mono" dir="ltr">
                                                                {abs.worker?.phone_number || '—'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-[11px] text-gray-700" dir="ltr">
                                                        {abs.absence_start?.replace('T', ' ')} → {abs.absence_end?.replace('T', ' ')}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-800 font-medium">
                                                        <div>{abs.reason}</div>
                                                        {abs.notes && (
                                                            <div className="text-[10px] text-gray-400 mt-0.5">{abs.notes}</div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-500 text-[11px]">
                                                        {abs.recorder?.name || 'Dispatcher'}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                            abs.status === 'resolved'
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${abs.status === 'resolved' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                            {abs.status === 'resolved' ? (isArabic ? 'تمت المعالجة' : 'Resolved') : (isArabic ? 'نشط (غائب)' : 'Reported')}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {abs.status !== 'resolved' ? (
                                                            <button
                                                                type="button"
                                                                disabled={resolveAbsenceMutation.isLoading}
                                                                onClick={() => resolveAbsenceMutation.mutate(abs.id)}
                                                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition shadow-2xs"
                                                            >
                                                                {resolveAbsenceMutation.isLoading ? '...' : (isArabic ? 'إغلاق الغياب' : 'Resolve')}
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: All Field Workers Directory */}
                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <span>{isArabic ? 'دليل الكادر الميداني' : 'All Field Workers Directory'}</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-700 font-bold">
                                        {filteredWorkers.length} {isArabic ? 'عامل' : 'workers'}
                                    </span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {isArabic
                                        ? 'استعراض جميع العمال المسجلين، فحص جداولهم الزمنية اليومية، وتسجيل الغياب بنقرة واحدة.'
                                        : 'View all registered workers, inspect their daily timelines, and log emergency absence.'}
                                </p>
                            </div>

                            {/* Worker Filters */}
                            <div className="flex items-center gap-2">
                                <div className="relative w-48 sm:w-64">
                                    <input
                                        type="text"
                                        value={workerSearch}
                                        onChange={(e) => setWorkerSearch(e.target.value)}
                                        placeholder={isArabic ? 'بحث بالاسم، الجوال، الجنسية...' : 'Search name, mobile...'}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#E91E63] outline-none"
                                    />
                                </div>
                                <select
                                    value={workerGenderFilter}
                                    onChange={(e) => setWorkerGenderFilter(e.target.value)}
                                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#E91E63] outline-none bg-white"
                                >
                                    <option value="">{isArabic ? 'جميع الجنسين' : 'All Genders'}</option>
                                    <option value="Female">{isArabic ? 'إناث' : 'Female'}</option>
                                    <option value="Male">{isArabic ? 'ذكور' : 'Male'}</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse min-w-[850px] text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                            <th className="py-3 px-4 text-start">{isArabic ? 'العامل' : 'Worker'}</th>
                                            <th className="py-3 px-4 text-start">{isArabic ? 'الجنس والجنسية' : 'Gender & Nationality'}</th>
                                            <th className="py-3 px-4 text-start">{isArabic ? 'رقم الجوال' : 'Mobile'}</th>
                                            <th className="py-3 px-4 text-start">{isArabic ? 'الحالة' : 'Status'}</th>
                                            <th className="py-3 px-4 text-center">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {isLoadingWorkers ? (
                                            <tr>
                                                <td colSpan="5" className="py-8 text-center text-gray-400 font-bold">
                                                    {isArabic ? 'جاري تحميل قائمة العمال...' : 'Loading workers...'}
                                                </td>
                                            </tr>
                                        ) : filteredWorkers.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="py-8 text-center text-gray-400 font-bold">
                                                    {isArabic ? 'لا يوجد عمال يطابقون معايير البحث.' : 'No workers match search criteria.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredWorkers.map((w) => (
                                                <tr key={w.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 font-bold text-xs text-[#E91E63]">
                                                            {w.image ? (
                                                                <img src={w.image} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                w.name?.charAt(0)
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div>{w.name}</div>
                                                            <div className="text-[10px] text-gray-400 font-mono">ID: #{w.id}</div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-700">
                                                        <span className="font-semibold">{w.gender || '—'}</span>
                                                        <span className="text-gray-400 mx-1">•</span>
                                                        <span className="text-gray-500">{w.nationality || '—'}</span>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono font-bold text-gray-700" dir="ltr">
                                                        {w.phone_number || '—'}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                            w.status === 'active' || !w.status
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : 'bg-gray-100 text-gray-600 border-gray-200'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${w.status === 'active' || !w.status ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                                            {w.status === 'active' || !w.status ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setTimelineWorkerId(w.id)}
                                                                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                                                            >
                                                                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                <span>{isArabic ? 'المخطط اليومي' : 'Timeline'}</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => openAbsenceModalForWorker(w)}
                                                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                                                            >
                                                                <svg className="w-3 h-3 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                </svg>
                                                                <span>{isArabic ? 'تسجيل غياب' : 'Log Leave'}</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 0: Operations Workflow & Architecture Guide */}
            {isInfoModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-2xl p-6 sm:p-7 w-full max-w-2xl shadow-xl border border-gray-200 space-y-5 my-auto">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#E91E63] flex items-center justify-center font-bold">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-gray-900 tracking-tight">
                                        {isArabic ? 'دليل تدفق العمليات وتكامل الأنظمة' : 'Operations Workflow & Architecture Guide'}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {isArabic ? 'كيف تتكامل أقسام الحجوزات، والنقل، والتشغيل الميداني معاً.' : 'How Bookings, Transport Dispatch, and Field Operations connect.'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsInfoModalOpen(false)}
                                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* 3 Interconnected Stages */}
                        <div className="space-y-3">
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                                <div className="flex items-center gap-2 text-xs font-black text-gray-900">
                                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">1</span>
                                    <span>{isArabic ? 'المرحلة 1: سجل المبيعات والطلبات (/admin/bookings)' : 'Stage 1: Orders & Bookings (/admin/bookings)'}</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed ps-7">
                                    {isArabic
                                        ? 'السجل الإداري الشامل لجميع طلبات العملاء عبر كافة التواريخ، تتبع الفواتير، وحالات الدفع، وتأكيد الحجز.'
                                        : 'Master ledger for customer orders across all dates, payment status verification, and contract management.'}
                                </p>
                            </div>

                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                                <div className="flex items-center gap-2 text-xs font-black text-gray-900">
                                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[11px] font-bold">2</span>
                                    <span>{isArabic ? 'المرحلة 2: لوجستيات النقل والترحيل (/admin/transport-dispatch)' : 'Stage 2: Logistics & Transport (/admin/transport-dispatch)'}</span>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed ps-7">
                                    {isArabic
                                        ? 'توزيع أسطول الحافلات والسائقين ونقاط الانطلاق (الوثيقة V.17). تضمن جدولة انطلاق السائق قبل موعد الخدمة بـ 60 دقيقة لضمان وصول الطاقم.'
                                        : 'Fleet logistics and van dispatching (Doc V.17). Ensures drivers depart exactly 60 minutes prior to service start.'}
                                </p>
                            </div>

                            <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
                                <div className="flex items-center gap-2 text-xs font-black text-rose-900">
                                    <span className="w-5 h-5 rounded-full bg-[#E91E63] text-white flex items-center justify-center text-[11px] font-bold">3</span>
                                    <span>{isArabic ? 'المرحلة 3: غرفة التحكم والتشغيل الميداني (/admin/operations)' : 'Stage 3: Field Operations Control Room (/admin/operations)'}</span>
                                </div>
                                <p className="text-xs text-rose-900 leading-relaxed ps-7">
                                    {isArabic
                                        ? 'متابعة تنفيذ اليوم الحالي (الوثيقة V.18): تسجيل وقت البدء الفعلي، ووقت الانتهاء. في حال التأخر يتم رصد تعارض فاصل الـ 60 دقيقة وتفعيل تنبيه At-Risk فوراً مع ترشيح بدائل إنقاذ.'
                                        : 'Live day-of-service command center (Doc V.18): logs actual start/end times. If a job runs late, it validates the 60-min transition buffer and raises At-Risk alarms.'}
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                            <span className="font-black">{isArabic ? 'قاعدة الـ 60 دقيقة الإلزامية:' : 'Mandatory 60-Minute Rule:'} </span>
                            {isArabic
                                ? 'لا يسمح النظام بتداخل الرحلات، ويلزم بوجود فاصل زمني لا يقل عن 60 دقيقة بين نهاية خدمة وبداية الخدمة التالية لنفس الفريق لضمان سلامة التنقل والوصول في الموعد.'
                                : 'The system enforces a minimum 60-minute transition gap between consecutive bookings for the same worker or team to guarantee punctuality.'}
                        </div>

                        <div className="flex justify-end pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setIsInfoModalOpen(false)}
                                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
                            >
                                {isArabic ? 'فهمت ذلك' : 'Understood'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 1: Start Service */}
            {startModalBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-xl border border-gray-200 space-y-4 my-auto">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-600" />
                                <span>{isArabic ? 'تسجيل بدء تنفيذ الخدمة ميدانياً' : 'Start Service Execution'}</span>
                            </h3>
                            <button onClick={() => setStartModalBooking(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                        </div>

                        <p className="text-xs text-gray-500">
                            {isArabic
                                ? `تسجيل وقت البدء الفعلي للحجز #${startModalBooking.booking_ref}${startModalBooking.visit_label ? ` (${startModalBooking.visit_label})` : ''}. ستتحول الحالة تلقائياً إلى "قيد التنفيذ".`
                                : `Record actual start time for booking #${startModalBooking.booking_ref}${startModalBooking.visit_label ? ` (${startModalBooking.visit_label})` : ''}. Status will change to "In Service".`}
                        </p>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                                {isArabic ? 'وقت البدء الفعلي (HH:MM) *' : 'Actual Start Time (HH:MM) *'}
                            </label>
                            <input
                                type="time"
                                required
                                value={startTimeInput}
                                onChange={(e) => setStartTimeInput(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setStartModalBooking(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                            >
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                disabled={startServiceMutation.isLoading}
                                onClick={() =>
                                    startServiceMutation.mutate({
                                        bookingId: startModalBooking.id,
                                        actual_start_time: startTimeInput,
                                    })
                                }
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                            >
                                {startServiceMutation.isLoading ? (isArabic ? 'جاري البدء...' : 'Starting...') : (isArabic ? 'تأكيد بدء الخدمة' : 'Confirm Start')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: Complete Service */}
            {completeModalBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-xl border border-gray-200 space-y-4 my-auto">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                <span>{isArabic ? `تسجيل إنهاء الخدمة${completeModalBooking.visit_label ? ` (${completeModalBooking.visit_label})` : ''}` : `Complete Service Execution${completeModalBooking.visit_label ? ` (${completeModalBooking.visit_label})` : ''}`}</span>
                            </h3>
                            <button onClick={() => setCompleteModalBooking(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                                <span>⚡</span>
                                <span>{isArabic ? 'قاعدة التوقيت ومحرك فحص المخاطر (US-A36):' : 'Same-Day Timing & Risk Cascade Engine:'}</span>
                            </div>
                            <p>
                                {isArabic
                                    ? `تاريخ الخدمة: ${selectedDate}. يجب تحديد وقتي البدء والانتهاء معاً في نفس اليوم، ولا يمكن تحديث وقت واحد فقط. كما يُلزم تعيين سائق للنقل مسبقاً.`
                                    : `Service Date: ${selectedDate}. Both start and end times must be defined together on the same day. Driver assignment is required.`}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    {isArabic ? 'وقت البدء الفعلي (HH:MM) *' : 'Actual Start Time (HH:MM) *'}
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={startTimeInput}
                                    onChange={(e) => setStartTimeInput(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    {isArabic ? 'وقت الانتهاء الفعلي (HH:MM) *' : 'Actual End Time (HH:MM) *'}
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={endTimeInput}
                                    onChange={(e) => setEndTimeInput(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setCompleteModalBooking(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                            >
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                disabled={completeServiceMutation.isLoading}
                                onClick={() => {
                                    if (!startTimeInput || !endTimeInput) {
                                        toast.error(isArabic ? 'يجب إدخال وقتي البدء والانتهاء معاً في نفس اليوم، لا يمكن إدخال وقت واحد فقط.' : 'Both start time and end time must be entered together on the same day.');
                                        return;
                                    }
                                    if (endTimeInput <= startTimeInput) {
                                        toast.error(isArabic ? 'وقت الانتهاء الفعلي يجب أن يكون بعد وقت البدء وفي نفس اليوم.' : 'End time must be after start time on the same day.');
                                        return;
                                    }
                                    completeServiceMutation.mutate({
                                        bookingId: completeModalBooking.id,
                                        actual_start_time: startTimeInput,
                                        actual_end_time: endTimeInput,
                                    });
                                }}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                            >
                                {completeServiceMutation.isLoading ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'تأكيد إنهاء الخدمة' : 'Confirm Complete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: At-Risk Details */}
            {riskModalBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-xl border border-gray-200 space-y-4 my-auto">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-black text-rose-700 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-600" />
                                <span>{isArabic ? `تفاصيل الخطر والتأخير للحجز #${riskModalBooking.booking_ref}` : `Risk Cause for #${riskModalBooking.booking_ref}`}</span>
                            </h3>
                            <button onClick={() => setRiskModalBooking(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                        </div>

                        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-xs text-rose-900 leading-relaxed font-bold whitespace-pre-line">
                            {riskModalBooking.at_risk_reason || (isArabic ? 'مخاطر تأخير وانتقال غير محددة.' : 'Unspecified transition delay risk.')}
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => {
                                    setAlternativesBooking(riskModalBooking);
                                    setRiskModalBooking(null);
                                }}
                                className="px-4 py-2 bg-[#E91E63] hover:bg-[#D81B60] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                </svg>
                                <span>{isArabic ? 'البحث عن بديل مؤهل لإنقاذ الحجز' : 'Find Eligible Alternative'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRiskModalBooking(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                            >
                                {isArabic ? 'إغلاق' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 4: Alternative Candidates (US-A37) */}
            {alternativesBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-xl shadow-xl border border-gray-200 space-y-4 my-auto">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#E91E63]" />
                                    <span>{isArabic ? 'اقتراح بدائل مؤهلة للحجز (US-A37)' : 'Suggest Alternatives (US-A37)'}</span>
                                </h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    #{alternativesBooking.booking_ref} — {alternativesBooking.service?.name} ({format12Hour(alternativesBooking.planned_start_time)} - {format12Hour(alternativesBooking.planned_end_time)})
                                </p>
                            </div>
                            <button onClick={() => setAlternativesBooking(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                        </div>

                        {isLoadingAlternatives ? (
                            <div className="py-12 text-center text-gray-400 font-bold flex justify-center items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                                </svg>
                                <span>{isArabic ? 'جاري فحص الموارد المتاحة والخالية من التعارض...' : 'Searching non-conflicting candidates...'}</span>
                            </div>
                        ) : (alternativesData?.data?.candidates?.length ?? 0) === 0 ? (
                            <div className="py-8 text-center text-rose-500 font-bold bg-rose-50 rounded-xl border border-rose-200 text-xs">
                                {isArabic
                                    ? 'عذراً، لم يتم العثور على بدائل متاحة تلتزم بفاصل الـ 60 دقيقة وتطابق مهارات الخدمة لهذا الموعد.'
                                    : 'No eligible candidates found complying with the 60-min transition gap and skill requirements for this time slot.'}
                            </div>
                        ) : (
                            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                                {alternativesData.data.candidates.map((cand) => (
                                    <div
                                        key={cand.id}
                                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between hover:border-purple-300 transition"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900 text-xs">
                                                    {cand.type === 'team' ? `👥 ${cand.name}` : cand.name}
                                                </span>
                                                {cand.is_recommended && (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                                        {isArabic ? 'موصى به' : 'Recommended'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500 mt-1">
                                                {cand.type === 'team'
                                                    ? `${isArabic ? 'طاقم 3 أفراد' : '3 Crew Members'}: ${cand.members?.map((m) => m.name).join(', ')}`
                                                    : `${isArabic ? 'الجنس' : 'Gender'}: ${cand.gender} | ${cand.mobile || '—'}`}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            disabled={resolveRiskMutation.isLoading}
                                            onClick={() =>
                                                resolveRiskMutation.mutate({
                                                    bookingId: alternativesBooking.id,
                                                    candidate_type: cand.type,
                                                    candidate_id: cand.id,
                                                })
                                            }
                                            className="px-3.5 py-1.5 bg-[#E91E63] hover:bg-[#D81B60] text-white rounded-lg text-xs font-bold transition shadow-2xs disabled:opacity-50"
                                        >
                                            {resolveRiskMutation.isLoading ? '...' : (isArabic ? 'اعتماد البديل' : 'Assign')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setAlternativesBooking(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                            >
                                {isArabic ? 'إغلاق' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 5: Record Worker Absence */}
            {absenceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-xl border border-gray-200 space-y-4 my-auto">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-600" />
                                <span>{isArabic ? 'تسجيل غياب عامل ميداني' : 'Record Worker Absence'}</span>
                            </h3>
                            <button onClick={() => setAbsenceModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                recordAbsenceMutation.mutate(absenceForm);
                            }}
                            className="space-y-3.5"
                        >
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{isArabic ? 'العامل المكلف *' : 'Worker *'}</label>
                                <select
                                    required
                                    value={absenceForm.worker_id}
                                    onChange={(e) => setAbsenceForm({ ...absenceForm, worker_id: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none bg-white"
                                >
                                    <option value="">{isArabic ? 'اختر العامل...' : 'Select worker...'}</option>
                                    {workersList.map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} ({w.gender}) {w.phone_number ? `- ${w.phone_number}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">{isArabic ? 'بداية الغياب *' : 'Absence Start *'}</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={absenceForm.absence_start}
                                        onChange={(e) => setAbsenceForm({ ...absenceForm, absence_start: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">{isArabic ? 'نهاية الغياب *' : 'Absence End *'}</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={absenceForm.absence_end}
                                        onChange={(e) => setAbsenceForm({ ...absenceForm, absence_end: e.target.value })}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{isArabic ? 'سبب الغياب *' : 'Reason *'}</label>
                                <input
                                    type="text"
                                    required
                                    placeholder={isArabic ? 'مثال: إجازة مرضية طارئة، ظرف عائلي...' : 'e.g. Sick leave, emergency'}
                                    value={absenceForm.reason}
                                    onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{isArabic ? 'ملاحظات المشرف' : 'Dispatcher Notes'}</label>
                                <textarea
                                    rows="2"
                                    placeholder={isArabic ? 'ملاحظات اختيارية...' : 'Optional notes...'}
                                    value={absenceForm.notes}
                                    onChange={(e) => setAbsenceForm({ ...absenceForm, notes: e.target.value })}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setAbsenceModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                                >
                                    {isArabic ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={recordAbsenceMutation.isLoading}
                                    className="px-5 py-2 bg-[#E91E63] hover:bg-[#D81B60] text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                                >
                                    {recordAbsenceMutation.isLoading ? (isArabic ? 'جاري التسجيل...' : 'Saving...') : (isArabic ? 'تسجيل الغياب وتحديث المخاطر' : 'Save & Alert')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 6: Worker Daily Timeline (US-A31) */}
            {timelineWorkerId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-gray-100 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
                        {/* Header Banner */}
                        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-5 text-white relative">
                            <button
                                onClick={() => setTimelineWorkerId(null)}
                                className="absolute top-4 end-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-sm font-bold"
                            >
                                ✕
                            </button>

                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E91E63] to-[#D81B60] text-white font-black text-lg flex items-center justify-center shadow-md shrink-0 border border-white/20">
                                    {timelineData?.data?.worker?.name?.charAt(0) || 'W'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-base font-black text-white truncate">
                                            {timelineData?.data?.worker?.name || (isArabic ? 'العامل' : 'Worker')}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white border border-white/10">
                                            {timelineData?.data?.worker?.gender === 'female' ? (isArabic ? 'عاملة' : 'Female') : (isArabic ? 'عامل' : 'Male')}
                                        </span>
                                        {timelineData?.data?.worker?.nationality && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white/90 border border-white/10">
                                                {timelineData.data.worker.nationality}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-300 mt-1 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <span>📅</span>
                                            <span className="font-mono">{selectedDate}</span>
                                        </span>
                                        {timelineData?.data?.worker?.mobile && timelineData.data.worker.mobile !== '—' && (
                                            <a
                                                href={`tel:${timelineData.data.worker.mobile}`}
                                                className="flex items-center gap-1 text-[#F06292] hover:underline font-mono text-xs"
                                                dir="ltr"
                                            >
                                                <span>📞</span>
                                                <span>{timelineData.data.worker.mobile}</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {isLoadingTimeline ? (
                                <div className="py-12 text-center text-gray-400 font-bold flex flex-col justify-center items-center gap-3">
                                    <svg className="animate-spin h-8 w-8 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                                    </svg>
                                    <span className="text-sm font-semibold">{isArabic ? 'جاري جلب الجدول الزمني...' : 'Loading daily timeline...'}</span>
                                </div>
                            ) : (
                                <>
                                    {/* Absence Warning Banner if any */}
                                    {timelineData?.data?.absences && timelineData.data.absences.length > 0 && (
                                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-800">
                                            <span className="text-lg shrink-0">⚠️</span>
                                            <div className="text-xs">
                                                <p className="font-bold">{isArabic ? 'العامل مسجل في حالة غياب/إجازة في هذا التاريخ' : 'Worker is marked absent on this date'}</p>
                                                <p className="text-rose-600 mt-0.5">
                                                    {timelineData.data.absences[0]?.reason}
                                                    {timelineData.data.absences[0]?.notes ? ` — ${timelineData.data.absences[0].notes}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Quick Summary Metrics */}
                                    {timelineData?.data?.timeline && timelineData.data.timeline.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2.5 pb-2">
                                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                                                <span className="text-xs text-gray-500 font-medium">{isArabic ? 'إجمالي الخدمات' : 'Total Services'}</span>
                                                <span className="text-sm font-black text-gray-900">
                                                    {timelineData.data.timeline.filter(t => t.type === 'service').length}
                                                </span>
                                            </div>
                                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                                                <span className="text-xs text-gray-500 font-medium">{isArabic ? 'مستوى المخاطر' : 'Risk Status'}</span>
                                                <span className={`text-xs font-bold ${timelineData.data.timeline.some(t => t.is_at_risk || (t.type === 'transition_gap' && !t.is_valid)) ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {timelineData.data.timeline.some(t => t.is_at_risk || (t.type === 'transition_gap' && !t.is_valid))
                                                        ? (isArabic ? '⚠️ يوجد خطر' : '⚠️ At Risk')
                                                        : (isArabic ? '✓ منتظم' : '✓ Normal')}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Timeline Items */}
                                    {(timelineData?.data?.timeline?.length ?? 0) === 0 ? (
                                        <div className="py-12 text-center text-gray-400 space-y-2">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto text-xl">
                                                ☕
                                            </div>
                                            <p className="text-sm font-bold text-gray-600">
                                                {isArabic ? 'لا توجد خدمات مجدولة لهذا العامل في هذا اليوم.' : 'No scheduled services for this worker today.'}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {isArabic ? 'العامل متاح ومفرغ للإسناد والتشغيل.' : 'Worker is free and available for assignment.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="relative ps-6 space-y-4 before:absolute before:top-2 before:bottom-2 before:start-2.5 before:w-0.5 before:bg-gray-200">
                                            {timelineData.data.timeline.map((item, idx) => {
                                                if (item.type === 'transition_gap') {
                                                    return (
                                                        <div key={idx} className="relative -ms-3.5 my-2">
                                                            <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-2xs ${
                                                                item.is_valid
                                                                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                                                                    : 'bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-200 animate-pulse'
                                                            }`}>
                                                                <div className="flex items-center gap-1.5 font-bold">
                                                                    <span>{item.is_valid ? '🚗' : '⚠️'}</span>
                                                                    <span>
                                                                        {isArabic ? 'فاصل انتقال بين الخدمتين:' : 'Transition Gap:'}
                                                                    </span>
                                                                    <span className="font-mono text-[11px]" dir="ltr">
                                                                        {format12Hour(item.start_time)} → {format12Hour(item.end_time)}
                                                                    </span>
                                                                </div>
                                                                <div className="font-extrabold text-[11px] whitespace-nowrap">
                                                                    {item.gap_minutes} {isArabic ? 'دقيقة' : 'mins'}
                                                                    {item.is_valid ? ' ✓' : (isArabic ? ' (أقل من 60 دقيقة)' : ' (< 60m)')}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // Service Item
                                                const statusColor = 
                                                    item.status === 'inService' ? 'bg-amber-500' :
                                                    item.status === 'completed' ? 'bg-emerald-500' :
                                                    item.status === 'cancelled' ? 'bg-rose-500' : 'bg-blue-500';

                                                const statusBadgeClass =
                                                    item.status === 'inService' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                    item.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                    item.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                                    'bg-blue-50 text-blue-700 border border-blue-200';

                                                const statusLabel =
                                                    item.status === 'inService' ? (isArabic ? 'قيد التنفيذ' : 'In Service') :
                                                    item.status === 'completed' ? (isArabic ? 'مكتمل' : 'Completed') :
                                                    item.status === 'cancelled' ? (isArabic ? 'ملغي' : 'Cancelled') :
                                                    (isArabic ? 'مؤكد' : 'Upcoming');

                                                return (
                                                    <div key={idx} className="relative group">
                                                        {/* Timeline Dot */}
                                                        <span className={`absolute -start-[25px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ring-2 ring-gray-100 ${statusColor}`} />

                                                        {/* Card */}
                                                        <div className={`p-4 rounded-2xl border transition-all shadow-2xs ${
                                                            item.is_at_risk
                                                                ? 'bg-rose-50/60 border-rose-200'
                                                                : 'bg-white border-gray-200 hover:border-[#E91E63]/40 hover:shadow-xs'
                                                        }`}>
                                                            {/* Card Header: Ref, Service Name & Timing */}
                                                            <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-gray-100">
                                                                <div>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="font-mono text-xs font-black text-[#E91E63]">
                                                                            #{item.booking_ref}
                                                                        </span>
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeClass}`}>
                                                                            {statusLabel}
                                                                        </span>
                                                                        {item.is_at_risk && (
                                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                                                                                ⚠️ {isArabic ? 'في خطر' : 'At Risk'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <h4 className="font-bold text-gray-900 text-sm mt-1">
                                                                        {item.service_name || (isArabic ? 'خدمة منزلية' : 'Service')}
                                                                    </h4>
                                                                </div>

                                                                <div className="text-end shrink-0">
                                                                    <div className="text-xs font-black text-gray-800 font-mono bg-gray-100 px-2.5 py-1 rounded-lg" dir="ltr">
                                                                        {format12Hour(item.planned_start)} - {format12Hour(item.planned_end)}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Card Body: Customer & Address */}
                                                            <div className="mt-2.5 space-y-1.5 text-xs text-gray-600">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-bold text-gray-800 flex items-center gap-1.5">
                                                                        <span>👤</span>
                                                                        <span>{item.customer_name}</span>
                                                                    </span>
                                                                    {item.customer_mobile && item.customer_mobile !== '—' && (
                                                                        <a
                                                                            href={`tel:${item.customer_mobile}`}
                                                                            className="text-blue-600 hover:underline font-mono text-[11px]"
                                                                            dir="ltr"
                                                                        >
                                                                            {item.customer_mobile}
                                                                        </a>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-start gap-1.5 text-gray-500 text-[11px]">
                                                                    <span className="shrink-0 mt-0.5">📍</span>
                                                                    <span className="leading-relaxed">
                                                                        {item.address} {item.service_zone && item.service_zone !== '—' ? `(${item.service_zone})` : ''}
                                                                    </span>
                                                                </div>

                                                                {/* Actual Execution Timing if recorded */}
                                                                {(item.actual_start || item.actual_end) && (
                                                                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-mono bg-gray-50/80 p-2 rounded-xl" dir="ltr">
                                                                        <span className="font-sans font-bold text-gray-700">{isArabic ? 'التوقيت الفعلي:' : 'Actual:'}</span>
                                                                        <span>
                                                                            {format12Hour(item.actual_start) || '—'} → {format12Hour(item.actual_end) || '...'}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* At Risk Alert Reason */}
                                                                {item.is_at_risk && item.at_risk_reason && (
                                                                    <div className="mt-2 p-2 bg-rose-100/70 text-rose-800 rounded-xl text-[11px] font-medium leading-relaxed">
                                                                        ⚠️ {item.at_risk_reason}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setTimelineWorkerId(null)}
                                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition shadow-xs"
                            >
                                {isArabic ? 'إغلاق' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
