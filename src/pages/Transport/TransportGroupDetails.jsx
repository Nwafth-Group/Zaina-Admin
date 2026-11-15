import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
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

const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3] ? match[3].toUpperCase() : null;
    if (ampm) {
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
    }
    return hours * 60 + minutes;
};

const getMaxDepartureTimeMinutes = (shiftStartTimeStr) => {
    const shiftMins = parseTimeToMinutes(shiftStartTimeStr || '08:00');
    return Math.max(0, shiftMins - 60);
};

const formatMinutesTo24Hour = (totalMins) => {
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export default function TransportGroupDetails() {
    const [searchParams] = useSearchParams();
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const shift = searchParams.get('shift') || searchParams.get('start_time') || '08:00';
    const shiftFormatted = shift.length === 5 ? shift : shift.substring(0, 5);

    const navigate = useNavigate();
    const { i18n } = useTranslation('common');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    // 1. Fetch shift details (bookings, workers, driver manifests)
    const { data: shiftData, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['transport-shift-details', date, shiftFormatted],
        queryFn: async () => (await axiosInstance.get(`/admin/transport-dispatch/shift-details?service_date=${date}&start_time=${encodeURIComponent(shiftFormatted)}`)).data,
    });

    // 2. Fetch lookups for drivers and departure points
    const { data: driversData } = useQuery({
        queryKey: ['drivers-lookup'],
        queryFn: async () => (await axiosInstance.get('/admin/drivers?per_page=100')).data,
    });

    const { data: pointsData } = useQuery({
        queryKey: ['departure-points-lookup'],
        queryFn: async () => (await axiosInstance.get('/admin/departure-points?per_page=100')).data,
    });

    const drivers = driversData?.data?.items || driversData?.data || [];
    const departurePoints = pointsData?.data?.items || pointsData?.data || [];
    const details = shiftData?.data || { total_bookings: 0, total_workers: 0, assigned_workers: 0, unassigned_workers: 0, bookings: [], driver_manifests: [] };

    // Active driver manifests (filter out any empty driver manifests with 0 passengers)
    const activeDriverManifests = useMemo(() => {
        return (details.driver_manifests || []).filter(
            (m) => (Number(m.assigned_passengers_count) > 0 || (Array.isArray(m.passengers) && m.passengers.length > 0))
        );
    }, [details.driver_manifests]);

    // Check if the overall shift has already started
    const isShiftStarted = useMemo(() => {
        if (details?.is_shift_started !== undefined) return Boolean(details.is_shift_started);
        if (!date || !shiftFormatted) return false;
        try {
            const shiftDateTime = new Date(`${date}T${shiftFormatted}:00`);
            return new Date() >= shiftDateTime;
        } catch {
            return false;
        }
    }, [date, shiftFormatted, details?.is_shift_started]);

    // Check if a specific booking has already started
    const isBookingLocked = (booking) => {
        if (!booking) return isShiftStarted;
        if (booking.is_locked || booking.is_service_started) return true;
        if (['inService', 'completed', 'cancelled'].includes(booking.status)) return true;
        if (date && booking.start_time) {
            try {
                const bTime = booking.start_time.substring(0, 5);
                const bDateTime = new Date(`${date}T${bTime}:00`);
                return new Date() >= bDateTime;
            } catch {
                return isShiftStarted;
            }
        }
        return isShiftStarted;
    };

    // Modal state for worker assignment
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedWorkerTarget, setSelectedWorkerTarget] = useState(null);
    const [assignForm, setAssignForm] = useState({
        driver_id: '',
        departure_point_id: '',
        departure_time: '',
        notes: '',
    });

    // Mutation: Assign Worker to Driver
    const assignWorkerMutation = useMutation({
        mutationFn: async (payload) => {
            return (await axiosInstance.post('/admin/transport-dispatch/assign-worker', payload)).data;
        },
        onSuccess: (res) => {
            toast.success(res?.message || (isArabic ? 'تم تعيين العاملة للسائق بنجاح' : 'Worker assigned to driver successfully'));
            queryClient.invalidateQueries({ queryKey: ['transport-shift-details'] });
            queryClient.invalidateQueries({ queryKey: ['transport-dispatch-shifts-overview'] });
            refetch();
            setIsAssignModalOpen(false);
            setSelectedWorkerTarget(null);
        },
        onError: (err) => {
            const serverMsg = err.response?.data?.errors?.departure_time?.[0]
                || err.response?.data?.errors?.driver_id?.[0]
                || err.response?.data?.errors?.booking_id?.[0]
                || err.response?.data?.message
                || (isArabic ? 'حدث خطأ أثناء تعيين العاملة' : 'Error assigning worker');
            toast.error(serverMsg);
        },
    });

    // Mutation: Unassign Worker from Driver
    const unassignWorkerMutation = useMutation({
        mutationFn: async (payload) => {
            return (await axiosInstance.post('/admin/transport-dispatch/unassign-worker', payload)).data;
        },
        onSuccess: (res) => {
            toast.success(res?.message || (isArabic ? 'تم فك ارتباط العاملة بنجاح' : 'Worker unassigned successfully'));
            queryClient.invalidateQueries({ queryKey: ['transport-shift-details'] });
            queryClient.invalidateQueries({ queryKey: ['transport-dispatch-shifts-overview'] });
            refetch();
        },
        onError: (err) => {
            const serverMsg = err.response?.data?.errors?.booking_id?.[0]
                || err.response?.data?.message
                || (isArabic ? 'حدث خطأ أثناء فك التعيين' : 'Error unassigning worker');
            toast.error(serverMsg);
        },
    });

    const openAssignModal = (booking, worker) => {
        // If worker ALREADY has a driver AND service has started, do not allow change
        if (worker.is_assigned && isBookingLocked(booking)) {
            toast.error(isArabic ? 'لا يمكن تغيير السائق بعد بدء موعد الخدمة لأن العاملة مسندة بالفعل!' : 'Cannot change driver after service has started!');
            return;
        }

        setSelectedWorkerTarget({ booking, worker });
        const maxMins = getMaxDepartureTimeMinutes(shiftFormatted);
        const defaultDepartureTime = formatMinutesTo24Hour(maxMins);

        let existingDriverId = worker.assigned_driver?.id || '';
        let existingDepPointId = worker.departure_point?.id || (departurePoints[0]?.id ?? '');
        let existingDepTime = worker.departure_time ? worker.departure_time.substring(0, 5) : defaultDepartureTime;

        if (!existingDriverId && drivers.length > 0) {
            existingDriverId = drivers[0].id;
        }

        setAssignForm({
            driver_id: existingDriverId,
            departure_point_id: existingDepPointId,
            departure_time: existingDepTime,
            notes: '',
        });
        setIsAssignModalOpen(true);
    };

    const handleAssignSubmit = (e) => {
        e.preventDefault();
        if (!selectedWorkerTarget) return;

        // If worker already has a driver and service has started, block change
        if (selectedWorkerTarget.worker.is_assigned && isBookingLocked(selectedWorkerTarget.booking)) {
            toast.error(isArabic ? 'لا يمكن تغيير السائق بعد بدء موعد الخدمة لأن العاملة معينة لسائق بالفعل!' : 'Cannot change driver after service has started!');
            return;
        }

        const maxMins = getMaxDepartureTimeMinutes(shiftFormatted);
        const chosenMins = parseTimeToMinutes(assignForm.departure_time);

        // Departure time check for upcoming shifts
        if (!isBookingLocked(selectedWorkerTarget.booking) && chosenMins > maxMins) {
            const maxFormatted = format12Hour(formatMinutesTo24Hour(maxMins));
            toast.error(
                isArabic
                    ? `وقت انطلاق السائق يجب أن يكون قبل 60 دقيقة على الأقل من موعد الشفت (قبل ${maxFormatted})!`
                    : `Departure time must be at least 60 minutes before shift start (Before ${maxFormatted})!`
            );
            return;
        }

        assignWorkerMutation.mutate({
            service_date: date,
            start_time: shiftFormatted,
            booking_id: selectedWorkerTarget.booking.id,
            worker_id: selectedWorkerTarget.worker.worker_id,
            driver_id: assignForm.driver_id,
            departure_point_id: assignForm.departure_point_id,
            departure_time: assignForm.departure_time,
            notes: assignForm.notes,
        });
    };

    const handleUnassign = (booking, workerId, transportGroupId) => {
        if (isBookingLocked(booking)) {
            toast.error(isArabic ? 'لا يمكن فك ارتباط العاملة بعد بدء موعد الخدمة!' : 'Cannot unassign worker after service has started!');
            return;
        }

        if (!window.confirm(isArabic ? 'هل أنت متأكد من فك ارتباط هذه العاملة عن السائق؟' : 'Are you sure you want to unassign this worker from the driver?')) {
            return;
        }

        unassignWorkerMutation.mutate({
            booking_id: booking.id,
            worker_id: workerId,
            transport_group_id: transportGroupId,
        });
    };

    const exportDriverExcel = async (transportGroupId, driverName) => {
        try {
            const response = await axiosInstance.get(`/admin/transport-dispatch/drivers/${transportGroupId}/export-excel`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.ms-excel' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `driver_manifest_${driverName || 'driver'}_${date}.xls`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success(isArabic ? 'تم تصدير كشف السائق بنجاح' : 'Driver manifest exported');
        } catch {
            toast.error(isArabic ? 'فشل تصدير كشف السائق' : 'Failed to export driver manifest');
        }
    };

    const exportShiftExcel = async () => {
        try {
            const response = await axiosInstance.get(`/admin/transport-dispatch/shifts/export-excel?service_date=${date}&start_time=${encodeURIComponent(shiftFormatted)}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.ms-excel' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `shift_manifest_${date}_${shiftFormatted}.xls`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success(isArabic ? 'تم تصدير كشف الشفت المجمع بنجاح' : 'Shift manifest exported');
        } catch {
            toast.error(isArabic ? 'فشل تصدير كشف الشفت' : 'Failed to export shift manifest');
        }
    };

    const shareWhatsApp = (manifest) => {
        let text = `*جدول رحلة السائق الميداني - زينة*\n📅 التاريخ: ${date}\n⏰ شفت الخدمة: ${format12Hour(shiftFormatted)}\n👨‍✈️ السائق: ${manifest.driver_name} (${manifest.driver_phone})\n🚐 المركبة: ${manifest.vehicle_type} [${manifest.vehicle_plate}]\n🚏 نقطة الانطلاق: ${manifest.departure_point?.name || 'غير محددة'}\n⏱️ موعد التحرك: ${format12Hour(manifest.departure_time)}\n👥 عدد العاملات: ${manifest.assigned_passengers_count} / ${manifest.vehicle_capacity} مقاعد\n\n*قائمة العاملات والتوصيل:*\n`;
        manifest.passengers?.forEach((p, idx) => {
            text += `\n${idx + 1}) العاملة: ${p.worker_name} (${p.worker_phone})\n   العميل: ${p.customer_name} (${p.customer_phone})\n   الحجز: #${p.booking_ref} - ${p.service_name}\n   العنوان: ${p.destination_address}\n`;
        });
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // Calculate percentage readiness
    const readinessPercent = details.total_workers > 0
        ? Math.round((details.assigned_workers / details.total_workers) * 100)
        : 100;

    return (
        <div className="space-y-6 font-main w-full pb-20 max-w-7xl mx-auto">
            {/* Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/transport-dispatch')}
                        className="inline-flex items-center gap-1.5 text-gray-500 hover:text-[#E91E63] transition-colors font-semibold group cursor-pointer"
                    >
                        <svg className="w-4 h-4 rtl:rotate-180 text-gray-400 group-hover:text-[#E91E63] transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>{isArabic ? 'جدول الشفتات' : 'Shift Schedule'}</span>
                    </button>
                    <span className="text-gray-300">/</span>
                    <span className="font-bold text-gray-900">
                        {isArabic ? `شفت ${format12Hour(shiftFormatted)}` : `Shift ${format12Hour(shiftFormatted)}`}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {isShiftStarted ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>{isArabic ? 'موعد الشفت بدأ' : 'Shift Started'}</span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{isArabic ? 'متاح للتعيين والتعديل' : 'Open for Dispatching'}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Shift Operations Command Header */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
                <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gray-100">
                    <div className="flex items-start gap-4">
                        {/* Hour Monogram - Fresh Pink Aesthetic */}
                        <div className="w-14 h-14 rounded-2xl bg-pink-50 border border-pink-200 text-[#E91E63] flex flex-col items-center justify-center shrink-0 shadow-2xs">
                            <span className="text-[10px] uppercase font-bold text-[#E91E63]/70 leading-none">SHIFT</span>
                            <span className="text-base font-black font-mono tracking-tight leading-tight mt-0.5">
                                {shiftFormatted}
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-xl font-black text-gray-900 tracking-tight">
                                    {isArabic ? `إدارة ترحيل وتوزيع شفت ${format12Hour(shiftFormatted)}` : `Shift ${format12Hour(shiftFormatted)} Dispatch Operations`}
                                </h1>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium">
                                <span className="flex items-center gap-1.5 text-gray-700">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                    </svg>
                                    <span className="font-semibold">{date}</span>
                                </span>
                                <span>•</span>
                                <span className="text-[#E91E63] font-bold">
                                    {isArabic ? 'أقصى موعد لتحرك السائقين: قبل الشفت بـ 60 دقيقة' : 'Departure deadline: >= 60 min before shift'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Header Action: Export Excel */}
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={exportShiftExcel}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E91E63] hover:bg-[#D81B60] text-white text-xs font-bold transition shadow-xs hover:shadow-md hover:shadow-pink-500/20 active:scale-[0.98] cursor-pointer"
                        >
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            <span>{isArabic ? 'تصدير كشف الشفت المجمع (Excel)' : 'Export Shift Manifest'}</span>
                        </button>
                    </div>
                </div>

                {/* Logistics Metrics Strip */}
                <div className="bg-gray-50/70 p-4 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                        <div>
                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{isArabic ? 'إجمالي الحجوزات' : 'Bookings'}</div>
                            <div className="text-lg font-black text-gray-900 mt-0.5">{details.total_bookings} <span className="text-xs font-normal text-gray-500">{isArabic ? 'حجز' : 'bkg'}</span></div>
                        </div>

                        <div>
                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{isArabic ? 'العاملات المطلوب نقلهن' : 'Required Workers'}</div>
                            <div className="text-lg font-black text-gray-900 mt-0.5">{details.total_workers} <span className="text-xs font-normal text-gray-500">{isArabic ? 'عاملة' : 'workers'}</span></div>
                        </div>

                        <div>
                            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">{isArabic ? 'تم التعيين لسائق' : 'Assigned to Driver'}</div>
                            <div className="text-lg font-black text-emerald-700 mt-0.5">{details.assigned_workers} <span className="text-xs font-normal text-emerald-600">{isArabic ? 'تم إسنادهن' : 'assigned'}</span></div>
                        </div>

                        <div>
                            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">{isArabic ? 'بانتظار سائق' : 'Pending Driver'}</div>
                            <div className="text-lg font-black text-amber-700 mt-0.5">{details.unassigned_workers} <span className="text-xs font-normal text-amber-600">{isArabic ? 'متبقي' : 'pending'}</span></div>
                        </div>
                    </div>

                    {/* Progress Gauge */}
                    <div className="w-full md:w-60 border-t md:border-t-0 md:border-s border-gray-200/80 pt-3 md:pt-0 md:ps-6 shrink-0">
                        <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                            <span className="text-gray-500">{isArabic ? 'نسبة اكتمال الترحيل' : 'Dispatch Readiness'}</span>
                            <span className={`font-mono ${readinessPercent === 100 ? 'text-emerald-700' : 'text-gray-900'}`}>{readinessPercent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-2 rounded-full transition-all duration-500 ${readinessPercent === 100 ? 'bg-emerald-500' : 'bg-[#E91E63]'}`}
                                style={{ width: `${readinessPercent}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 1: Bookings & Worker-by-Worker Assignment */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                            <span>{isArabic ? 'حجوزات وعاملات الشفت' : 'Shift Bookings & Workers'}</span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                                {details.bookings.length}
                            </span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isArabic
                                ? 'يتم تعيين السائق ونقطة الانطلاق لكل عاملة على حدة مع فحص سعة المركبة تلقائياً.'
                                : 'Individual worker-to-driver assignment with real-time capacity validation.'}
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-16 text-center text-gray-400 font-bold">
                        <div className="flex justify-center items-center gap-2.5">
                            <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" />
                            </svg>
                            <span>{isArabic ? 'جاري تحميل تفاصيل الشفت...' : 'Loading shift details...'}</span>
                        </div>
                    </div>
                ) : details.bookings.length === 0 ? (
                    <div className="p-16 text-center text-gray-400 font-bold">
                        {isArabic ? 'لا توجد حجوزات مجدولة في هذا الشفت.' : 'No bookings scheduled for this shift.'}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {details.bookings.map((booking) => {
                            const locked = isBookingLocked(booking);

                            return (
                                <div key={booking.id} className="p-5 hover:bg-gray-50/40 transition">
                                    {/* Booking Header Meta */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-mono font-bold text-xs border border-slate-200">
                                                #{booking.booking_ref}
                                            </span>
                                            <span className="font-black text-sm text-gray-900">
                                                {booking.service_name}
                                            </span>
                                            {booking.team_name && (
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                                    👥 {booking.team_name}
                                                </span>
                                            )}
                                            {locked && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shadow-2xs">
                                                    <svg className="w-3 h-3 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                                    </svg>
                                                    <span>{isArabic ? 'الخدمة بدأت / قيد التنفيذ' : 'Service In Progress'}</span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs text-gray-500 flex items-center gap-3">
                                            <span className="font-mono text-gray-700 font-bold">⏰ {format12Hour(booking.start_time)} - {format12Hour(booking.end_time)}</span>
                                            <span>•</span>
                                            <span className="font-bold text-gray-800">📍 {booking.governorate} — {booking.area}</span>
                                        </div>
                                    </div>

                                    {/* Client and Destination Strip */}
                                    <div className="py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-600">
                                        <span>👤 <strong className="text-gray-900">{booking.customer_name}</strong></span>
                                        <span>📞 <strong className="text-gray-900 font-mono" dir="ltr">{booking.customer_phone}</strong></span>
                                        <span className="text-gray-700 truncate max-w-lg" title={booking.service_address}>
                                            🏠 <span>{booking.service_address}</span>
                                        </span>
                                    </div>

                                    {/* Workers Assignment Cards */}
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {booking.workers.map((worker) => (
                                            <div
                                                key={worker.worker_id}
                                                className={`p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                                                    worker.is_assigned
                                                        ? 'bg-emerald-50/30 border-emerald-200/80 shadow-2xs'
                                                        : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    {/* Avatar Badge */}
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                                        worker.is_assigned
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-pink-100 text-[#E91E63]'
                                                    }`}>
                                                        {worker.name?.charAt(0) || 'ع'}
                                                    </div>

                                                    <div className="min-w-0 flex-1 space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-xs text-gray-900 truncate">{worker.name}</p>
                                                            <span className="text-[10px] text-gray-400 font-mono" dir="ltr">{worker.phone}</span>
                                                        </div>

                                                        {worker.is_assigned ? (
                                                            <div className="text-[11px] text-emerald-800 space-y-0.5">
                                                                <p className="font-bold flex items-center gap-1 truncate">
                                                                    <span>🚐 {worker.assigned_driver?.name}</span>
                                                                    <span className="text-gray-500 font-normal">({worker.assigned_driver?.vehicle_type})</span>
                                                                </p>
                                                                <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
                                                                    <span>⏱️ {format12Hour(worker.departure_time)}</span>
                                                                    <span>•</span>
                                                                    <span className="truncate">{worker.departure_point?.name || 'سكن العاملات'}</span>
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                {isArabic ? 'بانتظار سائق للتحرك' : 'Awaiting Driver'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="shrink-0 flex items-center gap-1.5">
                                                    {worker.is_assigned ? (
                                                        /* Worker HAS a driver */
                                                        locked ? (
                                                            /* Driver is assigned AND booking is starting / inService -> LOCK unassign & change */
                                                            <span
                                                                className="px-2.5 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-500 text-[11px] font-bold flex items-center gap-1.5 cursor-not-allowed select-none"
                                                                title={isArabic ? 'لا يمكن فك ارتباط أو تغيير السائق بعد بدء موعد الخدمة' : 'Service started: driver locked'}
                                                            >
                                                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                                                </svg>
                                                                <span>{isArabic ? 'معين (مقفل للتعديل)' : 'Assigned (Locked)'}</span>
                                                            </span>
                                                        ) : (
                                                            /* Driver is assigned but booking has NOT started yet -> Can change or unassign */
                                                            <>
                                                                <button
                                                                    onClick={() => openAssignModal(booking, worker)}
                                                                    className="px-2.5 py-1 text-xs font-bold text-gray-700 hover:text-black bg-white border border-gray-200 hover:border-gray-300 rounded-lg transition shadow-2xs cursor-pointer"
                                                                >
                                                                    {isArabic ? 'تغيير' : 'Change'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUnassign(booking, worker.worker_id, worker.transport_group_id)}
                                                                    className="px-2 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 hover:border-rose-300 rounded-lg transition shadow-2xs cursor-pointer"
                                                                    title={isArabic ? 'فك الارتباط' : 'Unassign'}
                                                                >
                                                                    {isArabic ? 'فك الربط' : 'Unassign'}
                                                                </button>
                                                            </>
                                                        )
                                                    ) : (
                                                        /* Worker does NOT have a driver ("Awaiting Driver") -> ALWAYS CAN ASSIGN! */
                                                        <button
                                                            onClick={() => openAssignModal(booking, worker)}
                                                            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#E91E63] hover:bg-[#D81B60] rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                                                        >
                                                            <span>+</span>
                                                            <span>{isArabic ? 'تعيين سائق' : 'Assign Driver'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* SECTION 2: Driver Manifests Table (Below Table) */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                            <span>{isArabic ? 'كشوفات وجداول رحلات السائقين الميدانية' : 'Assigned Drivers Manifests'}</span>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                {activeDriverManifests.length}
                            </span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isArabic
                                ? 'يتم عرض كل سائق بالعمالة المسندة إليه مع عداد السعة وزر تصدير ملف Excel مستقل لكل سائق.'
                                : 'Driver loads, passengers list, real-time capacity meters, and single-driver Excel exports.'}
                        </p>
                    </div>
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg shrink-0">
                        🚐 {activeDriverManifests.length} {isArabic ? 'سائقين مكلفين' : 'Assigned Drivers'}
                    </span>
                </div>

                {activeDriverManifests.length === 0 ? (
                    <div className="p-16 text-center text-gray-400 space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto text-xl">
                            🚐
                        </div>
                        <p className="font-bold text-sm text-gray-600">{isArabic ? 'لم يتم تعيين أي سائق في هذا الشفت بعد' : 'No drivers assigned for this shift yet'}</p>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">
                            {isArabic
                                ? 'اضغط على زر [تعيين سائق] بجانب أي عاملة في الجدول أعلاه، وسيتم إنشاء كشف رحلة السائق هنا تلقائياً.'
                                : 'Click [Assign Driver] next to any worker in the table above to start populating driver manifests.'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {activeDriverManifests.map((manifest) => {
                            const percent = manifest.vehicle_capacity > 0
                                ? Math.min(100, Math.round((manifest.assigned_passengers_count / manifest.vehicle_capacity) * 100))
                                : 0;

                            return (
                                <div key={manifest.transport_group_id} className="p-5 space-y-4">
                                    {/* Driver Header Strip */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="font-black text-sm text-gray-900 flex items-center gap-1.5">
                                                    <span>👨‍✈️</span>
                                                    <span>{manifest.driver_name}</span>
                                                </span>
                                                <span className="text-xs text-gray-500 font-mono" dir="ltr">({manifest.driver_phone})</span>
                                                <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 font-bold text-xs">
                                                    🚐 {manifest.vehicle_type} [{manifest.vehicle_plate}]
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                                                <span>🚏 <b>{manifest.departure_point?.name || 'سكن العاملات'}</b></span>
                                                <span>•</span>
                                                <span>⏱️ {isArabic ? 'موعد التحرك:' : 'Departure:'} <b className="text-emerald-700 font-mono">{format12Hour(manifest.departure_time)}</b></span>
                                                <span>•</span>
                                                <span>👥 {isArabic ? 'الحمولة:' : 'Capacity:'} <b>{manifest.assigned_passengers_count} / {manifest.vehicle_capacity} {isArabic ? 'مقاعد' : 'seats'}</b></span>
                                            </div>

                                            {/* Linear Progress Capacity Bar */}
                                            <div className="w-full max-w-sm pt-1">
                                                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                                            percent >= 100 ? 'bg-amber-500' : 'bg-emerald-600'
                                                        }`}
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                            <button
                                                onClick={() => exportDriverExcel(manifest.transport_group_id, manifest.driver_name)}
                                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                                title={isArabic ? 'تصدير كشف السائق Excel' : 'Export Driver Excel'}
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                                </svg>
                                                <span>{isArabic ? 'كشف السائق (Excel)' : 'Excel'}</span>
                                            </button>

                                            <button
                                                onClick={() => shareWhatsApp(manifest)}
                                                className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                                title={isArabic ? 'مشاركة عبر واتساب' : 'Share WhatsApp'}
                                            >
                                                <span>WhatsApp</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Passengers Table */}
                                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                                        <table className="w-full text-xs text-start">
                                            <thead className="bg-gray-50/80 text-gray-500 font-bold border-b border-gray-100">
                                                <tr>
                                                    <th className="p-2.5 text-center w-12">#</th>
                                                    <th className="p-2.5 text-start">{isArabic ? 'العاملة' : 'Worker'}</th>
                                                    <th className="p-2.5 text-start">{isArabic ? 'رقم الحجز' : 'Booking'}</th>
                                                    <th className="p-2.5 text-start">{isArabic ? 'الخدمة' : 'Service'}</th>
                                                    <th className="p-2.5 text-start">{isArabic ? 'العميل' : 'Customer'}</th>
                                                    <th className="p-2.5 text-start">{isArabic ? 'عنوان التوصيل' : 'Dropoff Address'}</th>
                                                    <th className="p-2.5 text-center w-24">{isArabic ? 'إجراء' : 'Action'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 font-medium">
                                                {manifest.passengers?.map((p, pIdx) => {
                                                    // Find the corresponding booking to check lock status
                                                    const matchingBooking = details.bookings.find((b) => b.id === p.booking_id);
                                                    const locked = p.is_locked || p.is_service_started || isBookingLocked(matchingBooking);

                                                    return (
                                                        <tr key={p.group_worker_id || pIdx} className="hover:bg-gray-50/50">
                                                            <td className="p-2.5 text-center text-gray-400 font-bold">{pIdx + 1}</td>
                                                            <td className="p-2.5">
                                                                <div className="font-bold text-gray-900">{p.worker_name}</div>
                                                                <div className="text-[11px] text-gray-400 font-mono" dir="ltr">{p.worker_phone}</div>
                                                            </td>
                                                            <td className="p-2.5 font-bold text-[#E91E63]">#{p.booking_ref}</td>
                                                            <td className="p-2.5 text-gray-800">{p.service_name}</td>
                                                            <td className="p-2.5">
                                                                <div className="font-bold text-gray-900">{p.customer_name}</div>
                                                                <div className="text-[11px] text-gray-400 font-mono" dir="ltr">{p.customer_phone}</div>
                                                            </td>
                                                            <td className="p-2.5 text-gray-600 max-w-xs truncate" title={p.destination_address}>
                                                                {p.destination_address}
                                                            </td>
                                                            <td className="p-2.5 text-center">
                                                                {locked ? (
                                                                    <span
                                                                        className="text-gray-400 font-bold text-[11px] bg-gray-100 px-2 py-1 rounded inline-flex items-center gap-1 cursor-not-allowed border border-gray-200 select-none"
                                                                        title={isArabic ? 'لا يمكن فك الارتباط بعد بدء موعد الخدمة' : 'Service started - locked'}
                                                                    >
                                                                        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                                                        </svg>
                                                                        <span>{isArabic ? 'مقفل' : 'Locked'}</span>
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleUnassign({ id: p.booking_id }, p.worker_id, manifest.transport_group_id)}
                                                                        className="text-rose-600 hover:text-rose-800 font-bold text-[11px] px-2 py-1 rounded hover:bg-rose-50 transition cursor-pointer"
                                                                    >
                                                                        {isArabic ? 'فك الربط' : 'Unassign'}
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODAL: Assign Worker to Driver */}
            {isAssignModalOpen && selectedWorkerTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100">
                        {/* Modal Header */}
                        <div className="p-4.5 border-b border-gray-100 flex items-center justify-between bg-pink-50/50">
                            <div>
                                <h3 className="font-black text-sm text-gray-900">
                                    {isArabic ? 'تعيين عاملة لسائق ميداني' : 'Assign Worker to Driver'}
                                </h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    {selectedWorkerTarget.worker.name} • #{selectedWorkerTarget.booking.booking_ref}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="w-8 h-8 rounded-lg hover:bg-white text-gray-400 hover:text-gray-600 flex items-center justify-center cursor-pointer transition"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleAssignSubmit} className="p-5 space-y-4">
                            {/* Destination Preview */}
                            <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1 border border-gray-100">
                                <p className="font-bold text-gray-700">📍 {isArabic ? 'وجهة التوصيل للعميل:' : 'Dropoff Destination:'}</p>
                                <p className="text-gray-600 text-[11px]">{selectedWorkerTarget.booking.service_address}</p>
                            </div>

                            {/* Driver Select */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    {isArabic ? 'اختر السائق والمركبة' : 'Select Driver & Vehicle'} *
                                </label>
                                <select
                                    required
                                    value={assignForm.driver_id}
                                    onChange={(e) => setAssignForm({ ...assignForm, driver_id: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none bg-white font-medium"
                                >
                                    <option value="">{isArabic ? '-- اختر سائقاً --' : '-- Select Driver --'}</option>
                                    {drivers.map((d) => {
                                        const manifest = details.driver_manifests?.find((m) => String(m.driver_id) === String(d.id));
                                        const currentLoad = manifest?.assigned_passengers_count || 0;
                                        const cap = d.vehicle_capacity || 5;
                                        const isFull = currentLoad >= cap;

                                        return (
                                            <option key={d.id} value={d.id}>
                                                {d.name} — {d.vehicle_type || 'حافلة'} (الحمولة: {currentLoad}/{cap} مقاعد) {isFull ? '⚠️ [ممتلئة]' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* Departure Point Select */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    {isArabic ? 'نقطة الانطلاق' : 'Departure Point'} *
                                </label>
                                <select
                                    required
                                    value={assignForm.departure_point_id}
                                    onChange={(e) => setAssignForm({ ...assignForm, departure_point_id: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none bg-white font-medium"
                                >
                                    <option value="">{isArabic ? '-- اختر نقطة الانطلاق --' : '-- Select Departure Point --'}</option>
                                    {departurePoints.map((pt) => (
                                        <option key={pt.id} value={pt.id}>
                                            {pt.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Departure Time Input */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-gray-700">
                                        {isArabic ? 'موعد انطلاق السائق' : 'Departure Time'} *
                                    </label>
                                    <span className="text-[10px] text-pink-600 font-bold">
                                        {isArabic ? 'قبل الشفت بساعة على الأقل' : 'Must be >= 60 min before shift'}
                                    </span>
                                </div>
                                <input
                                    type="time"
                                    required
                                    value={assignForm.departure_time}
                                    onChange={(e) => setAssignForm({ ...assignForm, departure_time: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none font-mono"
                                />
                            </div>

                            {/* Notes Input */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    {isArabic ? 'ملاحظات إضافية للسائق (اختياري)' : 'Notes for Driver (Optional)'}
                                </label>
                                <textarea
                                    rows={2}
                                    value={assignForm.notes}
                                    onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                                    placeholder={isArabic ? 'أي تعليمات خاصة بالوصول أو ترتيب النقل...' : 'Any special dropoff instructions...'}
                                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="pt-2 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                                >
                                    {isArabic ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={assignWorkerMutation.isPending}
                                    className="px-5 py-2.5 bg-[#E91E63] hover:bg-[#D81B60] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {assignWorkerMutation.isPending && (
                                        <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} className="opacity-25" />
                                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" />
                                        </svg>
                                    )}
                                    <span>{isArabic ? 'تأكيد التعيين' : 'Confirm Assignment'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
