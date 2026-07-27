import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import RescheduleBookingModal from './RescheduleBookingModal';
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

    const { data: booking, isLoading, isError } = useQuery({
        queryKey: ['bookingDetail', bookingId],
        queryFn: async () => (await axiosInstance.get(`/admin/bookings/${bookingId}`)).data.data,
        enabled: !!bookingId,
    });

    const statusMutation = useMutation({
        mutationFn: (payload) => axiosInstance.patch(`/admin/bookings/${bookingId}/status`, payload),
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم تحديث حالة الحجز بنجاح' : 'Booking status updated successfully'));
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', bookingId] });
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

                        {/* Assign Workers Button */}
                        {canModifyWorkersOrSchedule && hasPermission('bookings.edit') && (
                            <button
                                type="button"
                                onClick={() => setAssignModalOpen(true)}
                                className="bg-[#E91E63] hover:bg-[#d81b60] text-white px-4 h-10 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-2 outline-none"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                <span>{booking.workers?.length ? (isArabic ? 'تعديل العاملات' : 'Replace Workers') : (isArabic ? 'تعيين عاملات' : 'Assign Workers')}</span>
                            </button>
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
                                        </div>
                                    </div>

                                    {/* 3. Assigned Workers Card */}
                                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                                            <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                                </svg>
                                                <span>{isArabic ? 'العاملات المعينات على الحجز' : 'Assigned Workers'}</span>
                                            </h4>

                                            {canModifyWorkersOrSchedule && hasPermission('bookings.edit') && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAssignModalOpen(true)}
                                                    className="text-xs font-bold text-[#E91E63] hover:underline outline-none"
                                                >
                                                    {isArabic ? 'إدارة / تعيين العاملات →' : 'Manage Workers →'}
                                                </button>
                                            )}
                                        </div>

                                        {booking.workers && booking.workers.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {booking.workers.map((w) => (
                                                    <div
                                                        key={w.id}
                                                        onClick={() => navigate(`/workers/${w.id}`)}
                                                        className="flex items-center gap-3 p-3.5 bg-gray-50/60 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all cursor-pointer group shadow-2xs"
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
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-8 text-center border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs bg-gray-50/50">
                                                {isArabic ? 'لم يتم تعيين عاملات حتى الآن.' : 'No workers assigned yet.'}
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
                                                            <p className="text-xs font-medium text-gray-400 mt-0.5">{v.start_time} - {v.end_time} ({v.duration} {isArabic ? 'ساعة' : 'hours'})</p>
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
                />
            )}

            {rescheduleOpen && (
                <RescheduleBookingModal
                    booking={booking}
                    onClose={() => setRescheduleOpen(false)}
                />
            )}
        </div>
    );
}

function AssignWorkersModal({ booking, isArabic, t, onClose }) {
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
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', booking.id] });
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
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
            <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col font-main animate-in zoom-in-95 duration-200">
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
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                            {isArabic ? 'العمال المتاحون والمؤهلون' : 'Eligible & Available Workers'}
                        </label>

                        {isLoading ? (
                            <div className="py-6 flex justify-center">
                                <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                            </div>
                        ) : eligibleWorkers.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-gray-200 rounded-2xl text-gray-400 text-xs bg-gray-50/50">
                                {isArabic ? 'لا يوجد عمال مؤهلون متاحون لهذا الوقت.' : 'No eligible workers available for this time slot.'}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[240px] overflow-y-auto p-1.5 border border-gray-100 rounded-2xl">
                                {eligibleWorkers.map((w) => {
                                    const checked = selectedIds.includes(w.id);
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
                                                <span className="text-[11px] font-medium text-gray-400 mt-0.5">{w.nationality || '—'} · ⭐ {w.avg_rating || '5.0'}</span>
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
