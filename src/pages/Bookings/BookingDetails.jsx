import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import RescheduleBookingModal from './RescheduleBookingModal';
import AssignTeamModal from './AssignTeamModal';
import { hasPermission } from '../../utils/permissions.js';

const STATUS_STYLES = {
    Upcoming: 'bg-blue-50 text-blue-700 border-blue-200/80',
    inService: 'bg-amber-50 text-amber-700 border-amber-200/80',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200/80',
};

const STATUS_DOT_STYLES = {
    Upcoming: 'bg-blue-500',
    inService: 'bg-amber-500 animate-pulse',
    completed: 'bg-emerald-500',
    cancelled: 'bg-rose-500',
};

const PAYMENT_STYLES = {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
    refunded: 'bg-purple-50 text-purple-700 border-purple-200',
};

const InfoItem = ({ icon, label, value, highlight = false, isLink = false, onClick = null }) => (
    <div className="flex items-start gap-3 p-3.5 bg-gray-50/60 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-colors">
        {icon && (
            <div className="w-8 h-8 rounded-xl bg-white border border-gray-200/60 flex items-center justify-center text-gray-500 shrink-0 shadow-2xs">
                {icon}
            </div>
        )}
        <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
            {isLink && onClick ? (
                <button
                    type="button"
                    onClick={onClick}
                    className="text-sm font-extrabold text-[#E91E63] hover:underline truncate block text-start outline-none"
                >
                    {value ?? '—'}
                </button>
            ) : (
                <p className={`text-sm ${highlight ? 'font-extrabold text-gray-900' : 'font-bold text-gray-700'} truncate`}>
                    {value ?? '—'}
                </p>
            )}
        </div>
    </div>
);

export default function BookingDetails() {
    const { id: bookingId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('bookings');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('details'); // details | history
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelNote, setCancelNote] = useState('');
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignTeamModalOpen, setAssignTeamModalOpen] = useState(false);
    const [replacingWorker, setReplacingWorker] = useState(null);
    const [rescheduleOpen, setRescheduleOpen] = useState(false);
    const [downloadingContract, setDownloadingContract] = useState(false);

    const handleDownloadContract = async () => {
        if (!booking) return;
        try {
            setDownloadingContract(true);
            const response = await axiosInstance.get(`/admin/bookings/${booking.id}/contract`, {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Contract-${booking.booking_ref || booking.id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success(isArabic ? 'تم تحميل العقد بنجاح' : 'Contract downloaded successfully');
        } catch (error) {
            console.error('Failed to download contract:', error);
            toast.error(isArabic ? 'فشل تحميل العقد. الرجاء المحاولة لاحقاً.' : 'Failed to download contract. Please try again later.');
        } finally {
            setDownloadingContract(false);
        }
    };

    const { data: booking, isLoading, isError, refetch } = useQuery({
        queryKey: ['bookingDetail', String(bookingId)],
        queryFn: async () => (await axiosInstance.get(`/admin/bookings/${bookingId}`)).data.data,
        enabled: !!bookingId,
    });

    const statusMutation = useMutation({
        mutationFn: (payload) => axiosInstance.patch(`/admin/bookings/${bookingId}/status`, payload),
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم تحديث حالة الحجز بنجاح' : 'Booking status updated successfully'));
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail'] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', String(bookingId)] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', Number(bookingId)] });
            refetch();
            setStatusDropdownOpen(false);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || (isArabic ? 'حدث خطأ أثناء تحديث الحالة.' : 'Failed to update status.'));
        },
    });

    const changeStatus = (status, note) => statusMutation.mutate({ status, ...(note ? { note } : {}) });

    const status = booking?.status;
    const isWorkingStatus = status === 'Upcoming' || status === 'inService';
    const isTerminal = status === 'completed' || status === 'cancelled';
    const canModifyWorkersOrSchedule = status === 'Upcoming' || status === 'Pending Assignment';
    const hasTeam = Boolean(booking?.team_id || booking?.team);
    const hasWorkers = Array.isArray(booking?.workers) && booking.workers.length > 0;
    const isSpecializedService = Boolean(
        (booking?.service?.id >= 6 && booking?.service?.id <= 11) ||
        ['SOFA_CLEANING', 'WATER_TANK_CLEANING', 'STAIRS_SURFACES_CLEANING', 'AC_CLEANING', 'CARPET_CLEANING', 'CAR_WASH', 'MATTRESS_CLEANING', 'CURTAIN_CLEANING'].includes((booking?.service?.service_code || '').toUpperCase())
    );
    const isTeamBasedConfig = (booking?.service?.is_team_based !== undefined && booking?.service?.is_team_based !== null)
        ? Boolean(booking.service.is_team_based)
        : (booking?.is_team_based !== undefined && booking?.is_team_based !== null ? Boolean(booking.is_team_based) : isSpecializedService);
    const isTeamService = hasTeam || isTeamBasedConfig;
    const busy = statusMutation.isPending;

    const getCairoDate = () => {
        const now = new Date();
        const options = { timeZone: 'Africa/Cairo', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false };
        const formatter = new Intl.DateTimeFormat('en-US', options);
        const parts = formatter.formatToParts(now);
        const partValues = {};
        parts.forEach(p => { partValues[p.type] = p.value; });
        return new Date(partValues.year, partValues.month - 1, partValues.day, partValues.hour, partValues.minute, partValues.second);
    };

    const getLocalDateString = () => {
        const d = getCairoDate();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const isToday = booking?.raw_booking_date === getLocalDateString();

    const hasPassedEndTime = () => {
        if (!booking || !booking.raw_booking_date || !booking.raw_end_time) return false;
        const bookingDateStr = booking.raw_booking_date;
        const startTimeStr = booking.raw_start_time || '00:00:00';
        const endTimeStr = booking.raw_end_time || '00:00:00';
        const start = new Date(`${bookingDateStr}T${startTimeStr}`);
        let end = new Date(`${bookingDateStr}T${endTimeStr}`);
        if (end < start) {
            end.setDate(end.getDate() + 1);
        }
        return getCairoDate() >= end;
    };
    const isEndTimePassed = hasPassedEndTime();

    const confirmCancel = () => {
        changeStatus('cancelled', cancelNote.trim());
        setCancelOpen(false);
        setCancelNote('');
    };

    const translateDay = (dayName) => {
        const m = {
            'Monday': 'الإثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء',
            'Thursday': 'الخميس', 'Friday': 'الجمعة', 'Saturday': 'السبت', 'Sunday': 'الأحد'
        };
        return m[dayName] || dayName;
    };

    return (
        <div className="space-y-6 font-main w-full pb-12">
            {/* Top Navigation & Breadcrumbs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
                <div>
                    <button
                        onClick={() => navigate('/bookings')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E91E63] transition-colors mb-1.5 outline-none group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>{isArabic ? 'العودة لقائمة الحجوزات' : 'Back to Bookings'}</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                            {isArabic ? 'تفاصيل الحجز' : 'Booking Details'}
                        </h2>
                        {booking?.booking_ref && (
                            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 border border-gray-200">
                                #{booking.booking_ref}
                            </span>
                        )}
                    </div>
                </div>

                {/* Primary Action Buttons Bar */}
                {booking && (
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        {/* Download PDF Contract */}
                        <button
                            type="button"
                            disabled={downloadingContract}
                            onClick={handleDownloadContract}
                            className="bg-white border border-gray-200 text-gray-700 hover:text-[#0284c7] hover:border-[#0284c7] px-4 h-10 rounded-xl text-xs font-bold shadow-2xs hover:bg-sky-50/50 active:scale-95 transition-all flex items-center gap-2 outline-none disabled:opacity-50"
                        >
                            {downloadingContract ? (
                                <svg className="animate-spin h-4 w-4 text-[#0284c7]" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-[#0284c7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                            )}
                            <span>{isArabic ? 'تنزيل عقد الحجز PDF' : 'Download Contract PDF'}</span>
                        </button>

                        {/* Assign / Reassign Staff Buttons */}
                        {canModifyWorkersOrSchedule && hasPermission('bookings.edit') && (
                            hasTeam ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAssignTeamModalOpen(true)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 h-10 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-2 outline-none cursor-pointer"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                        </svg>
                                        <span>{isArabic ? 'إعادة تعيين الفريق' : 'Reassign Team'}</span>
                                    </button>
                                    {isSpecializedService && (
                                        <button
                                            type="button"
                                            onClick={() => setAssignModalOpen(true)}
                                            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3.5 h-10 rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition-all outline-none cursor-pointer"
                                        >
                                            <span>{isArabic ? 'تعديل كعمالة فردية' : 'Assign Workers'}</span>
                                        </button>
                                    )}
                                </div>
                            ) : hasWorkers ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setAssignModalOpen(true)}
                                        className="bg-[#E91E63] hover:bg-[#d81b60] text-white px-4 h-10 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-2 outline-none cursor-pointer"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                        <span>{isArabic ? 'تعديل العاملين' : 'Replace Workers'}</span>
                                    </button>
                                    {isSpecializedService && (
                                        <button
                                            type="button"
                                            onClick={() => setAssignTeamModalOpen(true)}
                                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 h-10 rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition-all outline-none cursor-pointer flex items-center gap-1.5"
                                        >
                                            <span>{isArabic ? 'التحويل إلى فريق عمل 👥' : 'Switch to Team 👥'}</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {isTeamBasedConfig ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setAssignTeamModalOpen(true)}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 h-10 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-2 outline-none cursor-pointer"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                                </svg>
                                                <span>{isArabic ? 'تعيين فريق عمل' : 'Assign Team'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAssignModalOpen(true)}
                                                className="bg-[#E91E63] hover:bg-[#d81b60] text-white px-3.5 h-10 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all outline-none cursor-pointer"
                                            >
                                                <span>{isArabic ? 'تعيين عمال أفراد' : 'Assign Workers'}</span>
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setAssignModalOpen(true)}
                                            className="bg-[#E91E63] hover:bg-[#d81b60] text-white px-4 h-10 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-2 outline-none cursor-pointer"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                            </svg>
                                            <span>{isArabic ? 'تعيين العاملين' : 'Assign Workers'}</span>
                                        </button>
                                    )}
                                </div>
                            )
                        )}

                        {/* Update Status Dropdown */}
                        {!isTerminal && hasPermission('bookings.edit') && (
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                                    disabled={busy}
                                    className="bg-gray-900 text-white hover:bg-gray-800 px-4 h-10 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-2 outline-none"
                                >
                                    <span>{isArabic ? 'تحديث حالة الحجز' : 'Update Status'}</span>
                                    <svg className={`w-3.5 h-3.5 text-gray-300 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {statusDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(false)} />
                                        <div className="absolute end-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-2 z-20 animate-in fade-in zoom-in-95 duration-100">
                                            {status !== 'Upcoming' && status !== 'inService' && (
                                                <button
                                                    type="button"
                                                    onClick={() => changeStatus('Upcoming')}
                                                    className="w-full text-start px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-blue-50/70 hover:text-blue-600 rounded-xl transition-all flex items-center gap-3"
                                                >
                                                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                                                    <div>
                                                        <p className="font-bold">{t('status.Upcoming')}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium">{isArabic ? 'جدولة الزيارة القادمة' : 'Schedule upcoming service'}</p>
                                                    </div>
                                                </button>
                                            )}

                                            {status !== 'inService' && isToday && (
                                                <button
                                                    type="button"
                                                    onClick={() => changeStatus('inService')}
                                                    className="w-full text-start px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-amber-50/70 hover:text-amber-600 rounded-xl transition-all flex items-center gap-3"
                                                >
                                                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                                                    <div>
                                                        <p className="font-bold">{t('status.inService')}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium">{isArabic ? 'بدء تقديم الخدمة' : 'Start rendering service'}</p>
                                                    </div>
                                                </button>
                                            )}

                                            {isEndTimePassed && (
                                                <button
                                                    type="button"
                                                    onClick={() => changeStatus('completed')}
                                                    className="w-full text-start px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-emerald-50/70 hover:text-emerald-600 rounded-xl transition-all flex items-center gap-3"
                                                >
                                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                                                    <div>
                                                        <p className="font-bold">{t('details.mark_completed')}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium">{isArabic ? 'إتمام الخدمة بنجاح' : 'Successfully completed service'}</p>
                                                    </div>
                                                </button>
                                            )}

                                            <div className="border-t border-gray-100 my-1.5" />

                                            <button
                                                type="button"
                                                onClick={() => { setCancelOpen(true); setStatusDropdownOpen(false); }}
                                                className="w-full text-start px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-3"
                                            >
                                                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                                                <div>
                                                    <p className="font-bold">{t('details.cancel_booking')}</p>
                                                    <p className="text-[10px] text-rose-400 font-medium">{isArabic ? 'إلغاء الحجز بالكامل' : 'Cancel full booking'}</p>
                                                </div>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-20 flex flex-col items-center justify-center text-gray-400">
                    <svg className="animate-spin h-9 w-9 text-[#E91E63] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="font-bold text-sm text-gray-600">{isArabic ? 'جاري تحميل تفاصيل الحجز...' : 'Loading booking details...'}</p>
                </div>
            ) : isError || !booking ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-16 text-center text-rose-600 font-bold">
                    {isArabic ? 'حدث خطأ أثناء تحميل تفاصيل الحجز.' : 'Error loading booking details.'}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Top Hero Banner Card */}
                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-[#FDF0F3] border border-pink-100 flex items-center justify-center text-[#E91E63] shrink-0 shadow-2xs">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0C2.678 5.57 2.25 6.05 2.25 6.618v1.657m12 0v1.5a.75.75 0 01-.75.75H12" />
                                    </svg>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="text-xl md:text-2xl font-black text-gray-900">{booking.service_name}</h3>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${STATUS_STYLES[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                            <span className={`w-2 h-2 rounded-full ${STATUS_DOT_STYLES[status] || 'bg-gray-400'}`} />
                                            {t(`status.${status}`, status)}
                                        </span>
                                        {booking?.payment_status && (
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${PAYMENT_STYLES[booking.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                                                {t(`payment.${booking.payment_status}`, booking.payment_status)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-medium text-gray-500 flex items-center gap-2">
                                        <span>{t(`visit_types.${booking.visit_type}`, booking.visit_type)}</span>
                                        <span>•</span>
                                        <span>{booking.booking_date}</span>
                                        <span>•</span>
                                        <span>{booking.time_slot}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Total Price Metric Block */}
                            <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-4 md:px-6 text-start md:text-end shrink-0 min-w-[180px]">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('details.total')}</p>
                                <p className="text-2xl font-black text-[#E91E63] mt-0.5">
                                    {booking.price_summary?.total} <span className="text-xs font-bold text-gray-500">{booking.price_summary?.currency}</span>
                                </p>
                                {booking.price_summary?.payment_method && (
                                    <p className="text-[11px] font-medium text-gray-500 capitalize mt-0.5">
                                        {booking.price_summary.payment_method}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Layout Grid */}
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        {/* Side Navigation Tabs */}
                        <div className="w-full lg:w-60 bg-white border border-gray-100 rounded-3xl p-3 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto shadow-2xs">
                            <button
                                type="button"
                                onClick={() => setActiveTab('details')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-start w-full whitespace-nowrap ${
                                    activeTab === 'details'
                                        ? 'bg-[#FDF0F3] text-[#E91E63] shadow-2xs'
                                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                </svg>
                                <span>{t('menu.details')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('history')}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-start w-full whitespace-nowrap ${
                                    activeTab === 'history'
                                        ? 'bg-[#FDF0F3] text-[#E91E63] shadow-2xs'
                                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{t('menu.history')}</span>
                            </button>
                        </div>

                        {/* Content Cards Body */}
                        <div className="flex-1 w-full min-w-0 space-y-6">
                            {activeTab === 'details' ? (
                                <>
                                    {/* 1. Customer Information Card */}
                                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                                            <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                                </svg>
                                                <span>{t('details.customer')}</span>
                                            </h4>
                                            {booking.customer?.id && (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/clients/${booking.customer.id}`)}
                                                    className="text-xs font-bold text-[#E91E63] hover:underline outline-none"
                                                >
                                                    {isArabic ? 'عرض ملف العميل →' : 'View Profile →'}
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            <InfoItem
                                                label={t('details.name')}
                                                value={booking.customer?.name}
                                                highlight
                                                isLink={Boolean(booking.customer?.id)}
                                                onClick={() => booking.customer?.id && navigate(`/clients/${booking.customer.id}`)}
                                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>}
                                            />
                                            <InfoItem
                                                label={t('details.phone')}
                                                value={booking.customer?.phone}
                                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.47-5.166-3.812-6.636-6.636l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>}
                                            />
                                            <InfoItem
                                                label={t('details.email')}
                                                value={booking.customer?.email}
                                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>}
                                            />
                                            {booking.contract_id && (
                                                <InfoItem
                                                    label={isArabic ? 'رقم العقد' : 'Contract ID'}
                                                    value={booking.contract_id}
                                                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
                                                />
                                            )}
                                            {booking.created_at && (
                                                <InfoItem
                                                    label={isArabic ? 'تاريخ الإنشاء' : 'Created At'}
                                                    value={booking.created_at}
                                                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. Service & Shift Details Card */}
                                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                                            <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-1.964.987-1.964 2.063v.798c0 .878-.713 1.59-1.59 1.59H12a1.5 1.5 0 01-1.5-1.5v-1.066c0-.987-.803-1.79-1.79-1.79H7.644c-.792 0-1.442-.64-1.442-1.442V8.375" />
                                                </svg>
                                                <span>{t('details.service')}</span>
                                            </h4>

                                            {canModifyWorkersOrSchedule && hasPermission('bookings.edit') && (
                                                <button
                                                    type="button"
                                                    onClick={() => setRescheduleOpen(true)}
                                                    className="text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3.5 py-1.5 rounded-xl transition-all outline-none"
                                                >
                                                    {isArabic ? 'إعادة جدولة الحجز' : 'Reschedule Booking'}
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            <InfoItem label={t('details.service_name')} value={booking.service_name} highlight />
                                            <InfoItem label={t('table.visit_type')} value={t(`visit_types.${booking.visit_type}`, booking.visit_type)} />
                                            <InfoItem label={isArabic ? 'عدد الزيارات' : 'Number of Visits'} value={booking.visit_number} />
                                            <InfoItem label={t('details.date')} value={booking.booking_date} />
                                            <InfoItem label={t('details.time')} value={booking.time_slot} />

                                            {booking.number_of_workers !== null && booking.number_of_workers !== undefined && (
                                                <InfoItem label={isArabic ? 'عدد العاملات المطلوبة' : 'Workers Count'} value={`${booking.number_of_workers} ${isArabic ? 'عاملات' : 'workers'}`} />
                                            )}
                                            {booking.worker_gender && (
                                                <InfoItem label={isArabic ? 'الجنس المطلوب' : 'Requested Gender'} value={isArabic ? (booking.worker_gender === 'Female' ? 'أنثى' : 'ذكر') : booking.worker_gender} />
                                            )}
                                            {booking.number_of_children !== null && booking.number_of_children !== undefined && (
                                                <InfoItem label={t('details.number_of_children')} value={booking.number_of_children} />
                                            )}
                                            {booking.number_of_persons !== null && booking.number_of_persons !== undefined && (
                                                <InfoItem label={isArabic ? 'عدد الأشخاص' : 'Number of Persons'} value={booking.number_of_persons} />
                                            )}
                                            {booking.child_age_groups && booking.child_age_groups.length > 0 && (
                                                <InfoItem
                                                    label={t('details.child_age_groups')}
                                                    value={booking.child_age_groups.map(group => isArabic ? group.name_ar : group.name_en).join(', ')}
                                                />
                                            )}
                                            {booking.team && (
                                                <InfoItem
                                                    label={isArabic ? 'فريق العمل المعين' : 'Assigned Team'}
                                                    value={`${booking.team.name || booking.team.code} (${booking.team.code})`}
                                                    highlight
                                                    icon={<svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                                                />
                                            )}
                                            {booking.selected_options && Array.isArray(booking.selected_options) && booking.selected_options.length > 0 && (
                                                <InfoItem
                                                    label={isArabic ? 'خيارات الخدمة' : 'Service Options'}
                                                    value={`${booking.selected_options.length} ${isArabic ? 'خيارات وبنود محددة' : 'options selected'}`}
                                                    icon={<svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* 2.5 Selected Service Options Breakdown Card */}
                                    {booking.selected_options && Array.isArray(booking.selected_options) && booking.selected_options.length > 0 && (
                                        <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                                                <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                                    </svg>
                                                    <span>{isArabic ? 'خيارات وبنود الخدمة المحددة' : 'Selected Service Options & Items'}</span>
                                                </h4>
                                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pink-50 text-[#E91E63] border border-pink-200">
                                                    {booking.selected_options.length} {isArabic ? 'خيارات' : 'Options'}
                                                </span>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-start text-xs">
                                                    <thead>
                                                        <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                                                            <th className="py-2.5 px-3 text-start">#</th>
                                                            <th className="py-2.5 px-3 text-start">{isArabic ? 'اسم البند / الخيار' : 'Item / Option'}</th>
                                                            <th className="py-2.5 px-3 text-center">{isArabic ? 'الكمية' : 'Quantity'}</th>
                                                            <th className="py-2.5 px-3 text-end">{isArabic ? 'سعر الوحدة' : 'Unit Price'}</th>
                                                            <th className="py-2.5 px-3 text-end">{isArabic ? 'الإجمالي' : 'Total'}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {booking.selected_options.map((opt, idx) => {
                                                            const optName = isArabic ? (opt.name_ar || opt.name || opt.name_en) : (opt.name_en || opt.name || opt.name_ar);
                                                            const qty = opt.quantity || opt.qty || 1;
                                                            const unitPrice = parseFloat(opt.unit_price || 0);
                                                            const totalPrice = parseFloat(opt.total_price || (unitPrice * qty));
                                                            const currency = booking.price_summary?.currency || 'EGP';

                                                            return (
                                                                <tr key={opt.id || idx} className="hover:bg-gray-50/60 transition-colors">
                                                                    <td className="py-3 px-3 font-mono text-gray-400">{idx + 1}</td>
                                                                    <td className="py-3 px-3 font-extrabold text-gray-800">{optName}</td>
                                                                    <td className="py-3 px-3 text-center">
                                                                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 font-black text-xs">
                                                                            {qty}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3 px-3 text-end text-gray-600 font-medium">
                                                                        {unitPrice.toFixed(2)} {currency}
                                                                    </td>
                                                                    <td className="py-3 px-3 text-end font-black text-gray-900">
                                                                        {totalPrice.toFixed(2)} {currency}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* 2.6 Operational Team Card (if assigned to a Team) */}
                                    {booking.team && (
                                        <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                                                <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                                    </svg>
                                                    <span>{isArabic ? 'فريق العمل التشغيلي' : 'Operational Team'}</span>
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    {canModifyWorkersOrSchedule && hasPermission('bookings.edit') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setAssignTeamModalOpen(true)}
                                                            className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2.5 py-1 rounded-xl transition-all outline-none cursor-pointer flex items-center gap-1.5 me-1"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                                            </svg>
                                                            <span>{isArabic ? 'إعادة تعيين الفريق' : 'Reassign Team'}</span>
                                                        </button>
                                                    )}
                                                    {booking.team.id && (
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/teams/${booking.team.id}`)}
                                                            className="text-xs font-bold text-[#E91E63] hover:underline outline-none me-1"
                                                        >
                                                            {isArabic ? 'عرض ملف الفريق ←' : 'View Team Profile →'}
                                                        </button>
                                                    )}
                                                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 border border-gray-200">
                                                        {booking.team.code}
                                                    </span>
                                                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        {booking.team.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <InfoItem
                                                    label={isArabic ? 'اسم الفريق' : 'Team Name'}
                                                    value={isArabic ? (booking.team.name_ar || booking.team.name) : (booking.team.name_en || booking.team.name)}
                                                    highlight
                                                    isLink={Boolean(booking.team.id)}
                                                    onClick={() => navigate(`/teams/${booking.team.id}`)}
                                                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                                                />
                                                <InfoItem
                                                    label={isArabic ? 'كود الفريق' : 'Team Code'}
                                                    value={booking.team.code}
                                                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>}
                                                />
                                                <InfoItem
                                                    label={isArabic ? 'قوام وتشكيل الفريق' : 'Team Roster'}
                                                    value={isArabic ? '3 عمال (ذكور حصراً)' : '3 Workers (Male only)'}
                                                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* 2.6 Unassigned Team Banner Card (When team service has no team assigned) */}
                                    {isTeamService && !booking.team && !hasWorkers && (
                                        <div className="bg-gradient-to-r from-amber-50 to-orange-50/40 border border-amber-200/80 rounded-3xl p-6 md:p-7 shadow-2xs">
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="text-sm font-black text-amber-900">
                                                                {isArabic ? 'بانتظار تعيين فريق عمل تشغيلي' : 'Pending Operational Team Assignment'}
                                                            </h4>
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
                                                                {isArabic ? 'لم يعين فريق بعد' : 'No Team Assigned'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-amber-700 mt-1 font-medium leading-relaxed">
                                                            {isArabic
                                                                ? 'تم حجز هذا الطلب لخدمة فرق عمل دون اختيار فريق مسبقاً. يرجى اختيار وتعيين فريق عمل مناسب لتأكيد التجهيز.'
                                                                : 'This team-based service was booked without a pre-assigned team. Please assign an available operational team.'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {canModifyWorkersOrSchedule && hasPermission('bookings.edit') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setAssignTeamModalOpen(true)}
                                                        className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-2 shrink-0 outline-none cursor-pointer"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                                        </svg>
                                                        <span>{isArabic ? 'تعيين فريق عمل الآن' : 'Assign Team Now'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. Assigned Workers Card */}
                                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                                    </svg>
                                                    <span>
                                                        {booking.team
                                                            ? (isArabic ? 'أعضاء الفريق المعين' : 'Assigned Team Members')
                                                            : (isArabic ? 'العاملات المعينات على الحجز' : 'Assigned Workers')}
                                                    </span>
                                                </h4>
                                                {booking.team && (
                                                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-lg">
                                                        {booking.team.name || booking.team.code}
                                                    </span>
                                                )}
                                            </div>

                                            {canModifyWorkersOrSchedule && hasPermission('bookings.edit') && (
                                                hasTeam ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setAssignTeamModalOpen(true)}
                                                            className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-xl outline-none cursor-pointer flex items-center gap-1 transition"
                                                        >
                                                            <span>{isArabic ? 'إعادة تعيين الفريق بالكامل 👥' : 'Reassign Full Team 👥'}</span>
                                                        </button>
                                                        {isSpecializedService && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setAssignModalOpen(true)}
                                                                className="text-xs font-bold text-gray-500 hover:text-gray-700 underline outline-none"
                                                            >
                                                                {isArabic ? 'تحويل لعمالة فردية' : 'Switch to Workers'}
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : hasWorkers ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setAssignModalOpen(true)}
                                                            className="text-xs font-bold text-[#E91E63] hover:underline outline-none"
                                                        >
                                                            {isArabic ? 'إدارة / تعيين العاملات →' : 'Manage Workers →'}
                                                        </button>
                                                        {isSpecializedService && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setAssignTeamModalOpen(true)}
                                                                className="text-xs font-bold text-indigo-600 hover:underline outline-none flex items-center gap-1"
                                                            >
                                                                <span>{isArabic ? 'التحويل إلى فريق عمل 👥' : 'Switch to Team 👥'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        {isTeamBasedConfig ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAssignTeamModalOpen(true)}
                                                                    className="text-xs font-bold text-indigo-600 hover:underline outline-none"
                                                                >
                                                                    {isArabic ? 'تعيين فريق عمل 👥' : 'Assign Team 👥'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAssignModalOpen(true)}
                                                                    className="text-xs font-bold text-[#E91E63] hover:underline outline-none"
                                                                >
                                                                    {isArabic ? 'تعيين عمال أفراد' : 'Assign Workers'}
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => setAssignModalOpen(true)}
                                                                className="text-xs font-bold text-[#E91E63] hover:underline outline-none"
                                                            >
                                                                {isArabic ? 'إدارة / تعيين العاملين →' : 'Manage Workers →'}
                                                            </button>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        {booking.workers && booking.workers.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {booking.workers.map((w) => (
                                                    <div
                                                        key={w.id}
                                                        className="flex items-center justify-between p-3.5 bg-gray-50/60 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all shadow-2xs group"
                                                    >
                                                        <div
                                                            onClick={() => navigate(`/workers/${w.id}`)}
                                                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                                                        >
                                                            <div className="w-11 h-11 rounded-full bg-[#FDF0F3] border border-pink-100 text-[#E91E63] flex items-center justify-center font-black text-base shrink-0 group-hover:scale-105 transition-transform">
                                                                {w.name?.charAt(0) || '?'}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-extrabold text-gray-900 group-hover:text-[#E91E63] transition-colors truncate">
                                                                    {w.name}
                                                                </p>
                                                                <p className="text-xs font-medium text-gray-400 mt-0.5 truncate">
                                                                    {w.nationality || '—'} · <span className="text-amber-500 font-bold">⭐ {w.avg_rating || '5.0'}</span>
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {canModifyWorkersOrSchedule && hasPermission('bookings.edit') && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setReplacingWorker(w);
                                                                }}
                                                                className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1.5 rounded-xl transition-all shrink-0 ms-2 outline-none cursor-pointer"
                                                                title={isArabic ? 'استبدال هذا العامل' : 'Replace this worker'}
                                                            >
                                                                {isArabic ? 'استبدال' : 'Replace'}
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-8 text-center border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs bg-gray-50/50">
                                                {isTeamService
                                                    ? (isArabic ? 'لم يتم تعيين فريق عمل بعد. سيتم ربط العمالة تلقائياً بمجرد تعيين الفريق.' : 'No team assigned yet. Team workers will be linked upon team assignment.')
                                                    : (isArabic ? 'لم يتم تعيين عمال حتى الآن.' : 'No workers assigned yet.')}
                                            </div>
                                        )}
                                    </div>

                                    {/* 4. Visit Schedule List Card */}
                                    {booking.visit_schedule && booking.visit_schedule.length > 0 && (
                                        <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                            <h4 className="text-sm font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                                                </svg>
                                                <span>{isArabic ? 'جدول زيارات الحجز' : 'Visit Schedule'}</span>
                                            </h4>

                                            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                                                {booking.visit_schedule.map((v, idx) => (
                                                    <div key={idx} className="flex justify-between items-center p-3.5 border border-gray-100 bg-gray-50/50 rounded-2xl hover:bg-gray-50 transition-colors">
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800">{v.visit_date} ({isArabic ? translateDay(v.visit_day) : v.visit_day})</p>
                                                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                                <span className="text-xs font-medium text-gray-400">{v.start_time} - {v.end_time} ({v.duration} {isArabic ? 'ساعة' : 'hours'})</span>
                                                                {(v.actual_start_time || v.actual_end_time) && (
                                                                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100" dir="ltr">
                                                                        {v.actual_start_time || '—'} → {v.actual_end_time || '...'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[v.visit_status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                            {t(`status.${v.visit_status}`, v.visit_status)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 5. Address Details Card */}
                                    {booking.address && (
                                        <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                            <h4 className="text-sm font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                                </svg>
                                                <span>{t('details.address')}</span>
                                            </h4>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <InfoItem label={t('details.label')} value={booking.address.label} highlight />
                                                <InfoItem label={t('details.phone')} value={booking.address.phone} />
                                                <div className="sm:col-span-2">
                                                    <InfoItem label={t('details.address_line')} value={booking.address.line} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 6. Pricing Summary Card */}
                                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                        <h4 className="text-sm font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5a1.5 1.5 0 011.5 1.5v9.75a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z" />
                                            </svg>
                                            <span>{t('details.price')}</span>
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                            <InfoItem label={t('details.subtotal')} value={`${booking.price_summary?.subtotal} ${booking.price_summary?.currency}`} />
                                            <InfoItem label={t('details.tax')} value={`${booking.price_summary?.tax} ${booking.price_summary?.currency}`} />

                                            {booking.price_summary?.service_discount_amount > 0 && (
                                                <InfoItem label={isArabic ? 'خصم الخدمة' : 'Service Discount'} value={`-${booking.price_summary.service_discount_amount} ${booking.price_summary.currency}`} />
                                            )}
                                            {booking.price_summary?.coupon_discount_amount > 0 && (
                                                <InfoItem label={`${isArabic ? 'خصم الكوبون' : 'Coupon Discount'} (${booking.price_summary.coupon_code || ''})`} value={`-${booking.price_summary.coupon_discount_amount} ${booking.price_summary.currency}`} />
                                            )}
                                            {booking.paid_points > 0 && (
                                                <InfoItem label={isArabic ? 'النقاط المستخدمة' : 'Points Used'} value={`${booking.paid_points} Pts`} />
                                            )}
                                            {booking.price_summary?.payment_method && (
                                                <InfoItem label={isArabic ? 'طريقة الدفع' : 'Payment Method'} value={booking.price_summary.payment_method} />
                                            )}
                                        </div>

                                        <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-500">{t('details.total')}</span>
                                            <span className="text-xl font-black text-[#E91E63]">{booking.price_summary?.total} {booking.price_summary?.currency}</span>
                                        </div>
                                    </div>

                                    {/* 7. Customer Special Notes */}
                                    {booking.customer_notes && (
                                        <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6">
                                            <h4 className="text-sm font-extrabold text-gray-900 mb-3">{t('details.notes')}</h4>
                                            <p className="text-xs font-medium text-gray-600 leading-relaxed bg-pink-50/30 p-4 rounded-2xl border border-pink-100/50 italic">
                                                "{booking.customer_notes}"
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* History / Timeline Activity Log Tab */
                                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                    <h4 className="text-sm font-extrabold text-gray-900 mb-6 pb-3 border-b border-gray-100 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>{t('details.activity_title')}</span>
                                    </h4>

                                    {(booking.activity || []).length === 0 ? (
                                        <p className="text-xs text-gray-400 py-6 text-center">{t('details.no_activity')}</p>
                                    ) : (
                                        <ul className="space-y-6 relative border-s border-pink-100 ms-3">
                                            {booking.activity.map((a) => (
                                                <li key={a.id} className="ms-6 relative">
                                                    <span className="absolute flex items-center justify-center w-6 h-6 bg-[#FDF0F3] text-[#E91E63] border border-pink-200 rounded-full -start-9 ring-4 ring-white shadow-2xs">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </span>
                                                    <div className="bg-gray-50/60 p-4 border border-gray-100 rounded-2xl space-y-1">
                                                        <p className="text-xs font-bold text-gray-800">
                                                            <span className="text-gray-400 font-medium">{a.old_status ? t(`status.${a.old_status}`, a.old_status) : '—'}</span>
                                                            <span className="text-gray-400 px-1.5">→</span>
                                                            <span className="text-[#E91E63] font-black">{t(`status.${a.new_status}`, a.new_status)}</span>
                                                        </p>
                                                        {a.note && <p className="text-xs text-gray-600 italic">"{a.note}"</p>}
                                                        <p className="text-[10px] text-gray-400 font-medium pt-1 border-t border-gray-100/60 mt-1">{a.at} · {a.by || t('details.system')}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            {cancelOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setCancelOpen(false)} />
                    <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h4 className="text-lg font-bold text-gray-800 mb-2">{t('details.cancel_booking')}</h4>
                        <p className="text-xs text-gray-500 mb-4">{t('details.confirm_cancel')}</p>
                        <textarea
                            value={cancelNote}
                            onChange={(e) => setCancelNote(e.target.value)}
                            rows="3"
                            placeholder={t('details.cancel_reason')}
                            className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-xl outline-none focus:bg-white focus:border-[#E91E63] focus:ring-2 focus:ring-[#E91E63]/10 transition-all resize-none text-xs font-medium"
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setCancelOpen(false)} className="px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors text-xs">
                                {t('details.keep')}
                            </button>
                            <button
                                onClick={confirmCancel}
                                disabled={busy || !cancelNote.trim()}
                                className="px-4 py-2 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                            >
                                {t('details.confirm_cancel_btn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {assignModalOpen && (
                <AssignWorkersModal
                    booking={booking}
                    isArabic={isArabic}
                    t={t}
                    onClose={() => setAssignModalOpen(false)}
                    onSuccess={() => refetch()}
                />
            )}

            {assignTeamModalOpen && (
                <AssignTeamModal
                    booking={booking}
                    isArabic={isArabic}
                    onClose={() => setAssignTeamModalOpen(false)}
                    onSuccess={() => refetch()}
                />
            )}

            {replacingWorker && (
                <ReplaceWorkerModal
                    booking={booking}
                    worker={replacingWorker}
                    isArabic={isArabic}
                    onClose={() => setReplacingWorker(null)}
                    onSuccess={() => refetch()}
                    onOpenAssignTeam={() => setAssignTeamModalOpen(true)}
                />
            )}

            {rescheduleOpen && (
                <RescheduleBookingModal
                    booking={booking}
                    onClose={() => setRescheduleOpen(false)}
                    onSuccess={() => refetch()}
                />
            )}
        </div>
    );
}

function AssignWorkersModal({ booking, isArabic, t, onClose, onSuccess }) {
    const queryClient = useQueryClient();
    const [selectedIds, setSelectedIds] = useState(booking.assigned_worker_ids || []);
    const [note, setNote] = useState('');
    const [overrideTime, setOverrideTime] = useState(false);
    const [showOverridePrompt, setShowOverridePrompt] = useState(false);

    const { data: eligibleWorkers = [], isLoading } = useQuery({
        queryKey: ['eligibleWorkers', booking.id],
        queryFn: async () => (await axiosInstance.get(`/admin/bookings/${booking.id}/eligible-workers`)).data.data || [],
        enabled: !!booking.id,
    });

    const assignMutation = useMutation({
        mutationFn: (payload) => axiosInstance.post(`/admin/bookings/${booking.id}/assign-workers`, payload),
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم تعيين العمال بنجاح' : 'Workers assigned successfully'));
            queryClient.invalidateQueries({ queryKey: ['bookingDetail'] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', String(booking.id)] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', Number(booking.id)] });
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            onSuccess?.();
            onClose();
        },
        onError: (error) => {
            const msg = error.response?.data?.message || '';
            if (error.response?.status === 422 && (msg.includes('started') || msg.includes('وقت') || msg.includes('تاريخ') || msg.includes('بدأ'))) {
                setShowOverridePrompt(true);
            } else {
                toast.error(msg || (isArabic ? 'حدث خطأ أثناء التعيين.' : 'An error occurred during assignment.'));
            }
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const limit = booking.number_of_workers || 1;
        if (selectedIds.length !== limit) {
            toast.error(isArabic
                ? `يجب اختيار ${limit} عامل(ة) بالضبط لهذا الحجز.`
                : `You must select exactly ${limit} worker(s) for this booking.`
            );
            return;
        }
        assignMutation.mutate({
            worker_ids: selectedIds.map(Number),
            note: note.trim(),
            override_time: overrideTime
        });
    };

    const handleOverrideConfirm = () => {
        setOverrideTime(true);
        setShowOverridePrompt(false);
        assignMutation.mutate({
            worker_ids: selectedIds.map(Number),
            note: note.trim(),
            override_time: true
        });
    };

    const toggleWorker = (id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(wId => wId !== id);
            }
            const limit = booking.number_of_workers || 1;
            if (prev.length >= limit) {
                toast.error(isArabic
                    ? `لا يمكنك اختيار أكثر من ${limit} عامل(ة) لهذا الحجز.`
                    : `You cannot select more than ${limit} worker(s) for this booking.`
                );
                return prev;
            }
            return [...prev, id];
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-3xl p-7 max-h-[90vh] flex flex-col font-main animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <h4 className="text-base font-bold text-gray-800">
                        {isArabic ? 'تعيين وتغيير عمال الحجز' : 'Assign & Replace Booking Workers'}
                    </h4>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 outline-none">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                                {isArabic ? 'العمال المتاحون والمؤهلون' : 'Eligible & Available Workers'}
                            </label>
                            {eligibleWorkers.length > 0 && (
                                <div className="flex items-center gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedIds(eligibleWorkers.map(w => w.id))}
                                        className="font-bold text-[#E91E63] hover:underline cursor-pointer"
                                    >
                                        {isArabic ? 'تحديد الكل' : 'Select All'}
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedIds([])}
                                        className="font-bold text-gray-500 hover:text-gray-700 hover:underline cursor-pointer"
                                    >
                                        {isArabic ? 'إلغاء التحديد' : 'Deselect All'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {isLoading ? (
                            <div className="py-6 flex justify-center">
                                <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                            </div>
                        ) : eligibleWorkers.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs bg-gray-50/50">
                                {isArabic ? 'لا يوجد عمال مؤهلون متاحون لهذا الوقت.' : 'No eligible workers available for this time slot.'}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto p-2 border border-gray-100 rounded-2xl">
                                {eligibleWorkers.map((w) => {
                                    const checked = selectedIds.includes(w.id);
                                    const workerServices = (w.assigned_services?.length
                                        ? w.assigned_services
                                        : (w.services?.length
                                            ? w.services
                                            : (w.assigned_service ? [w.assigned_service] : [])));

                                    return (
                                        <div
                                            key={w.id}
                                            onClick={() => toggleWorker(w.id)}
                                            className={`p-3 border rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between ${
                                                checked
                                                ? 'border-[#E91E63] bg-[#FDF0F3]/50 shadow-2xs'
                                                : 'border-gray-100 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold text-gray-800 truncate">{w.name}</span>
                                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                    <span className="text-[11px] font-medium text-gray-400">{w.nationality || '—'} · ⭐ {w.avg_rating || '5.0'}</span>
                                                    {w.gender && (
                                                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                                            String(w.gender).toLowerCase() === 'female'
                                                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                                : 'bg-sky-50 text-sky-700 border border-sky-200'
                                                        }`}>
                                                            {String(w.gender).toLowerCase() === 'female' ? (isArabic ? 'أنثى' : 'Female') : (isArabic ? 'ذكر' : 'Male')}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Service Badges */}
                                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                    {workerServices.length > 0 ? (
                                                        workerServices.map((s) => (
                                                            <span
                                                                key={s.id}
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200"
                                                            >
                                                                <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                </svg>
                                                                <span>{isArabic ? (s.name_ar || s.name_en) : (s.name_en || s.name_ar)}</span>
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                                            {isArabic ? 'غير مسند لخدمة' : 'Unassigned'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => {}}
                                                className="w-4 h-4 rounded text-[#E91E63] border-gray-300 focus:ring-[#E91E63] cursor-pointer"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                            {isArabic ? 'سبب التغيير / ملاحظة (اختياري)' : 'Reason for change / Note (Optional)'}
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows="2"
                            placeholder={isArabic ? 'مثال: استبدال العامل بسبب إجازة مرضية...' : 'e.g. Replacing worker due to sick leave...'}
                            className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#E91E63] focus:ring-2 focus:ring-[#E91E63]/10 rounded-xl outline-none text-xs transition-colors resize-none font-medium"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        {t('details.close')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={assignMutation.isPending || isLoading}
                        className="px-4 py-2 text-xs rounded-xl font-bold text-white bg-[#E91E63] hover:bg-[#d81b60] transition-colors disabled:opacity-50"
                    >
                        {isArabic ? 'حفظ التغييرات' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {showOverridePrompt && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowOverridePrompt(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h5 className="text-base font-bold text-gray-800 mb-2">
                            {isArabic ? 'وقت الخدمة بدأ بالفعل' : 'Service Time Already Started'}
                        </h5>
                        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                            {isArabic
                                ? 'بدأ وقت الخدمة لهذا الحجز. هل تريد تجاوز هذا القيد وتعيين العمال بأي حال؟'
                                : 'The service time for this booking has already started. Do you want to force this assignment update anyway?'}
                        </p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setShowOverridePrompt(false)}
                                className="px-3.5 py-1.5 text-xs rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleOverrideConfirm}
                                className="px-3.5 py-1.5 text-xs rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors"
                            >
                                {isArabic ? 'تجاوز وتأكيد' : 'Force Update'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ReplaceWorkerModal({ booking, worker, isArabic, onClose, onOpenAssignTeam, onSuccess }) {
    const queryClient = useQueryClient();
    const [selectedWorkerId, setSelectedWorkerId] = useState(null);
    const [reason, setReason] = useState('');
    const [overrideBuffer, setOverrideBuffer] = useState(false);

    const { data: eligibleWorkers = [], isLoading } = useQuery({
        queryKey: ['eligibleWorkers', booking.id],
        queryFn: async () => (await axiosInstance.get(`/admin/bookings/${booking.id}/eligible-workers`)).data.data || [],
        enabled: !!booking.id,
    });

    const hasAssignedTeam = Boolean(booking.team_id || booking.team);
    const isTeamBooking = Boolean(
        hasAssignedTeam ||
        booking.is_team_based ||
        booking.service?.is_team_based
    );

    const candidates = eligibleWorkers.filter(w => {
        if (w.id === worker.id) return false;
        if (isTeamBooking && w.gender && w.gender.toLowerCase() !== 'male') return false;
        if (booking.worker_gender && w.gender && w.gender.toLowerCase() !== booking.worker_gender.toLowerCase()) return false;
        return true;
    });

    const replaceMutation = useMutation({
        mutationFn: (payload) => axiosInstance.post(`/admin/bookings/${booking.id}/replace-worker`, payload),
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم استبدال العامل بنجاح وتحديث الجدول التشغيلي' : 'Worker replaced successfully'));
            queryClient.invalidateQueries({ queryKey: ['bookingDetail'] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', String(booking.id)] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', Number(booking.id)] });
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            onSuccess?.();
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || (isArabic ? 'فشل استبدال العامل.' : 'Failed to replace worker.'));
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedWorkerId) {
            toast.error(isArabic ? 'يرجى اختيار العامل البديل.' : 'Please select a replacement worker.');
            return;
        }
        if (!reason.trim()) {
            toast.error(isArabic ? 'يرجى كتابة سبب الاستبدال.' : 'Please enter the replacement reason.');
            return;
        }

        replaceMutation.mutate({
            old_worker_id: worker.id,
            new_worker_id: Number(selectedWorkerId),
            reason: reason.trim(),
            override_buffer: overrideBuffer,
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-3xl p-7 max-h-[90vh] flex flex-col font-main animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <div>
                        <h4 className="text-base font-bold text-gray-800">
                            {isArabic ? 'استبدال عضو في الفريق / الحجز' : 'Replace Worker / Team Member'}
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {isArabic ? `العامل الحالي: ${worker.name}` : `Current worker: ${worker.name}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 outline-none">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
                    {hasAssignedTeam && (
                        <div className="p-3.5 bg-indigo-50/90 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="flex items-start gap-2.5 text-indigo-950">
                                <span className="text-lg leading-none">👥</span>
                                <div>
                                    <p className="font-extrabold">
                                        {isArabic
                                            ? `هذا الحجز مسند إلى فريق العمل: (${booking.team?.name || booking.team?.code || '#' + booking.team_id})`
                                            : `This booking is assigned to team: (${booking.team?.name || booking.team?.code || '#' + booking.team_id})`}
                                    </p>
                                    <p className="text-[11px] text-indigo-700 mt-0.5">
                                        {isArabic
                                            ? 'هل ترغب في إعادة تعيين واختيار فريق عمل بديل بالكامل بدلاً من استبدال هذا العضو فقط؟'
                                            : 'Would you like to reassign the entire team instead of replacing just this member?'}
                                    </p>
                                </div>
                            </div>
                            {onOpenAssignTeam && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onOpenAssignTeam();
                                    }}
                                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
                                >
                                    {isArabic ? 'إعادة تعيين الفريق بالكامل ←' : 'Reassign Entire Team →'}
                                </button>
                            )}
                        </div>
                    )}

                    {isTeamBooking && (
                        <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-amber-800 text-xs flex items-start gap-2.5">
                            <span className="text-base leading-none">⚠️</span>
                            <div>
                                <p className="font-bold">{isArabic ? 'تحديث تلقائي لقالب الفريق' : 'Automatic Team Roster Update'}</p>
                                <p className="text-[11px] text-amber-700 mt-0.5">
                                    {isArabic
                                        ? 'استبدال هذا العامل سيقوم بنقل العامل الجديد لعضوية الفريق وإخراج العامل الحالي للحفاظ على قوام الفريق (3 عمال ذكور).'
                                        : 'Replacing this worker will transfer the new worker into this team and remove the current worker, maintaining the team roster (3 male workers).'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                            {isArabic ? 'اختر العامل البديل (المتاحون مع فاصل 60 دقيقة)' : 'Select Replacement Worker (60-min buffer verified)'}
                        </label>

                        {isLoading ? (
                            <div className="py-6 flex justify-center">
                                <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                            </div>
                        ) : candidates.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs bg-gray-50/50">
                                {isArabic ? 'لا يوجد عمال بدلاء متاحون يستوفون شروط الخدمة والفاصل الزمني.' : 'No available replacement workers meet the service and schedule buffer criteria.'}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto p-2 border border-gray-100 rounded-2xl">
                                {candidates.map((w) => {
                                    const selected = selectedWorkerId === w.id;
                                    return (
                                        <div
                                            key={w.id}
                                            onClick={() => setSelectedWorkerId(w.id)}
                                            className={`p-3 border rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between ${
                                                selected
                                                    ? 'border-[#E91E63] bg-[#FDF0F3]/60 shadow-2xs ring-1 ring-[#E91E63]'
                                                    : 'border-gray-100 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold text-gray-800 truncate">{w.name}</span>
                                                <span className="text-[11px] font-medium text-gray-400 mt-0.5">
                                                    {w.nationality || '—'} · ⭐ {w.avg_rating || '5.0'}
                                                    {w.gender && ` (${w.gender === 'male' || w.gender === 'Male' ? (isArabic ? 'ذكر' : 'Male') : (isArabic ? 'أنثى' : 'Female')})`}
                                                </span>
                                            </div>
                                            <input
                                                type="radio"
                                                name="replacement_worker"
                                                checked={selected}
                                                onChange={() => setSelectedWorkerId(w.id)}
                                                className="w-4 h-4 text-[#E91E63] border-gray-300 focus:ring-[#E91E63] cursor-pointer"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                            {isArabic ? 'سبب الاستبدال (مطلوب)' : 'Replacement Reason (Required)'} *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows="2"
                            placeholder={isArabic ? 'مثال: إجازة مرضية مفاجئة للعامل الحالي...' : 'e.g. Sudden illness or emergency for current worker...'}
                            className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#E91E63] focus:ring-2 focus:ring-[#E91E63]/10 rounded-xl outline-none text-xs transition-colors resize-none font-medium"
                        />
                    </div>

                    <div className="pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-600 select-none">
                            <input
                                type="checkbox"
                                checked={overrideBuffer}
                                onChange={(e) => setOverrideBuffer(e.target.checked)}
                                className="w-4 h-4 rounded text-[#E91E63] border-gray-300 focus:ring-[#E91E63]"
                            />
                            <span>{isArabic ? 'تجاوز شرط الفاصل الزمني (60 دقيقة) لحالات الطوارئ' : 'Override 60-min transition buffer (emergency only)'}</span>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={replaceMutation.isPending || isLoading || !selectedWorkerId || !reason.trim()}
                        className="px-4 py-2 text-xs rounded-xl font-bold text-white bg-[#E91E63] hover:bg-[#d81b60] transition-colors disabled:opacity-50"
                    >
                        {replaceMutation.isPending ? (isArabic ? 'جاري الاستبدال...' : 'Replacing...') : (isArabic ? 'تأكيد الاستبدال' : 'Confirm Replacement')}
                    </button>
                </div>
            </div>
        </div>
    );
}
