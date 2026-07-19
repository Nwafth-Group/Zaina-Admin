import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { FormSection } from '../../components/form/FormKit';
import RescheduleBookingModal from './RescheduleBookingModal';
import { hasPermission } from '../../utils/permissions.js';

const STATUS_STYLES = {
    Upcoming: 'bg-blue-50 text-blue-600 border-blue-200',
    inService: 'bg-amber-50 text-amber-600 border-amber-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
};

const PAYMENT_STYLES = {
    paid: 'bg-green-100 text-green-700',
    unpaid: 'bg-gray-100 text-gray-600',
    refunded: 'bg-purple-100 text-purple-700',
};

const Row = ({ label, value }) => (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
        <span className="text-sm text-gray-400 font-medium shrink-0">{label}</span>
        <span className="text-sm font-bold text-gray-800 text-end">{value ?? '—'}</span>
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
            toast.success(response.data?.message || 'تم تحديث حالة الحجز بنجاح');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', bookingId] });
            setStatusDropdownOpen(false);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء تحديث الحالة.');
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
        parts.forEach(p => {
            partValues[p.type] = p.value;
        });
        
        return new Date(
            partValues.year,
            partValues.month - 1,
            partValues.day,
            partValues.hour,
            partValues.minute,
            partValues.second
        );
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

    const sideMenuItem = (key, label, iconPath) => {
        const active = activeTab === key;
        return (
            <button
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold transition-all text-start ${active ? 'bg-[#FDF0F3] text-[#E91E63]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                </svg>
                {label}
            </button>
        );
    };

    const translateDay = (dayName) => {
        const m = {
            'Monday': 'الإثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء',
            'Thursday': 'الخميس', 'Friday': 'الجمعة', 'Saturday': 'السبت', 'Sunday': 'الأحد'
        };
        return m[dayName] || dayName;
    };

    return (
        <div className="space-y-6 font-main">
            {/* Back button and page title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <button 
                        onClick={() => navigate('/bookings')} 
                        className="flex items-center gap-1 text-gray-500 hover:text-[#E91E63] transition-colors text-xs font-bold mb-2 outline-none"
                    >
                        {isArabic ? '← العودة لقائمة الحجوزات' : '← Back to Bookings'}
                    </button>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                        {isArabic ? 'تفاصيل الحجز' : 'Booking Details'}
                    </h2>
                </div>
            </div>

            {isLoading ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center text-gray-500">
                    <svg className="animate-spin h-8 w-8 text-[#E91E63] mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isArabic ? 'جاري تحميل تفاصيل الحجز...' : 'Loading booking details...'}
                </div>
            ) : isError || !booking ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center text-red-500 font-bold">
                    {isArabic ? 'خطأ في تحميل تفاصيل الحجز.' : 'Error loading booking details.'}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Top hero profile card */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-start">
                            <div className="w-16 h-16 rounded-2xl bg-pink-50 border border-pink-100/50 flex items-center justify-center text-[#E91E63] shrink-0 shadow-sm">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
                                    <h3 className="text-xl md:text-2xl font-mono font-bold text-gray-800">{booking.booking_ref}</h3>
                                    <div className="flex flex-wrap gap-1.5 justify-center">
                                        {status && (
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${STATUS_STYLES[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                {t(`status.${status}`, status)}
                                            </span>
                                        )}
                                        {booking?.payment_status && (
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${PAYMENT_STYLES[booking.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                                                {t(`payment.${booking.payment_status}`, booking.payment_status)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{booking.service_name} · {t(`visit_types.${booking.visit_type}`, booking.visit_type)}</p>
                                <p className="text-xs text-gray-400 mt-1">{isArabic ? 'العميل: ' : 'Client: '} <span className="font-semibold text-gray-700">{booking.customer?.name}</span></p>
                            </div>
                        </div>

                        {/* Premium Status Changer / Action Menu */}
                        {!isTerminal && hasPermission('bookings.edit') && (
                            <div className="relative shrink-0 flex flex-wrap gap-2 justify-center">
                                {/* Premium Change Status Button */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                                        disabled={busy}
                                        className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <span>{isArabic ? 'تحديث حالة الحجز' : 'Update Status'}</span>
                                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
                                                         className="w-full text-start px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-blue-50/50 hover:text-blue-600 rounded-xl transition-all flex items-center gap-3"
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
                                                         className="w-full text-start px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-amber-50/50 hover:text-amber-600 rounded-xl transition-all flex items-center gap-3"
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
                                                         className="w-full text-start px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-green-50/50 hover:text-green-600 rounded-xl transition-all flex items-center gap-3"
                                                     >
                                                         <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                                                         <div>
                                                             <p className="font-bold">{t('details.mark_completed')}</p>
                                                             <p className="text-[10px] text-gray-400 font-medium">{isArabic ? 'إتمام الخدمة بنجاح' : 'Successfully completed service'}</p>
                                                         </div>
                                                     </button>
                                                 )}

                                                <div className="border-t border-gray-50 my-1.5" />

                                                <button
                                                    type="button"
                                                    onClick={() => { setCancelOpen(true); setStatusDropdownOpen(false); }}
                                                    className="w-full text-start px-3 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all flex items-center gap-3"
                                                >
                                                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
                                                    <div>
                                                        <p className="font-bold">{t('details.cancel_booking')}</p>
                                                        <p className="text-[10px] text-red-400 font-medium">{isArabic ? 'إلغاء الحجز بالكامل' : 'Cancel full booking'}</p>
                                                    </div>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Assign Workers Button */}
                                {canModifyWorkersOrSchedule && (
                                    <button
                                        type="button"
                                        onClick={() => setAssignModalOpen(true)}
                                        className="bg-[#E91E63] text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-[#D81B60] active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                        <span>{booking.workers?.length ? (isArabic ? 'تعديل العاملات' : 'Replace Workers') : (isArabic ? 'تعيين عاملات' : 'Assign Workers')}</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        {/* Side menu navigation tabs */}
                        <div className="w-full lg:w-56 bg-white border border-gray-100 rounded-3xl p-4 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto">
                            {sideMenuItem('details', t('menu.details'), 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z')}
                            {sideMenuItem('history', t('menu.history'), 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z')}
                        </div>

                        {/* Content area */}
                        <div className="flex-1 w-full min-w-0 space-y-6">
                            {activeTab === 'details' ? (
                                <>
                                    {/* Customer profile data */}
                                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                        <h4 className="text-sm font-bold text-gray-700 mb-4">{t('details.customer')}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm">
                                            <Row label={t('details.name')} value={booking.customer?.name} />
                                            <Row label={t('details.phone')} value={booking.customer?.phone} />
                                            <Row label={t('details.email')} value={booking.customer?.email} />
                                            {booking.contract_id && (
                                                <Row label={isArabic ? 'رقم العقد' : 'Contract ID'} value={booking.contract_id} />
                                            )}
                                            {booking.created_at && (
                                                <Row label={isArabic ? 'تاريخ الإنشاء' : 'Created At'} value={booking.created_at} />
                                            )}
                                        </div>
                                    </div>

                                    {/* Service definition details */}
                                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-sm font-bold text-gray-700">{t('details.service')}</h4>
                                            {canModifyWorkersOrSchedule && hasPermission('bookings.edit') && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setRescheduleOpen(true)}
                                                    className="text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-xl transition-all"
                                                >
                                                    {isArabic ? 'إعادة جدولة الحجز' : 'Reschedule Booking'}
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm mb-4">
                                            <Row label={t('details.service_name')} value={booking.service_name} />
                                            <Row label={t('table.visit_type')} value={t(`visit_types.${booking.visit_type}`, booking.visit_type)} />
                                            <Row label={isArabic ? 'عدد الزيارات' : 'Number of Visits'} value={booking.visit_number} />
                                            <Row label={t('details.date')} value={booking.booking_date} />
                                            <Row label={t('details.time')} value={booking.time_slot} />
                                            {booking.number_of_workers !== null && booking.number_of_workers !== undefined && (
                                                <Row label={isArabic ? 'عدد العاملات المطلوب' : 'Requested Workers Count'} value={booking.number_of_workers} />
                                            )}
                                            {booking.worker_gender && (
                                                <Row label={isArabic ? 'جنس العاملة المطلوب' : 'Requested Gender'} value={isArabic ? (booking.worker_gender === 'Female' ? 'أنثى' : 'ذكر') : booking.worker_gender} />
                                            )}
                                            {booking.number_of_children !== null && booking.number_of_children !== undefined && (
                                                <Row label={t('details.number_of_children')} value={booking.number_of_children} />
                                            )}
                                            {booking.child_age_groups && booking.child_age_groups.length > 0 && (
                                                <Row 
                                                    label={t('details.child_age_groups')} 
                                                    value={booking.child_age_groups.map(group => isArabic ? group.name_ar : group.name_en).join(', ')} 
                                                />
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            disabled={downloadingContract}
                                            onClick={handleDownloadContract}
                                            className="w-full text-center px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0284c7] hover:bg-[#0369a1] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                        >
                                            {downloadingContract ? (
                                                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                            )}
                                            <span>{isArabic ? 'تحميل عقد الحجز (PDF)' : 'Download Booking Contract (PDF)'}</span>
                                        </button>
                                    </div>

                                    {/* Assigned Workers list */}
                                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                        <h4 className="text-sm font-bold text-gray-700 mb-4">{isArabic ? 'العاملات المعينات على الحجز' : 'Assigned Workers'}</h4>
                                        {booking.workers && booking.workers.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                                                {booking.workers.map((w) => (
                                                    <div 
                                                        key={w.id} 
                                                        onClick={() => navigate(`/workers/${w.id}`)}
                                                        className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-[#FDF0F3] text-[#E91E63] flex items-center justify-center font-bold text-base shrink-0">
                                                            {w.name?.charAt(0) || '?'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-gray-800 truncate">{w.name}</p>
                                                            <p className="text-xs text-gray-400 mt-0.5">{isArabic ? 'الجنسية: ' : 'Nationality: '}{w.nationality || '—'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 py-1">{isArabic ? 'لم يتم تعيين عاملات بعد.' : 'No workers assigned yet.'}</p>
                                        )}
                                    </div>

                                    {/* Visit Schedule table */}
                                    {booking.visit_schedule && booking.visit_schedule.length > 0 && (
                                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                            <h4 className="text-sm font-bold text-gray-700 mb-4">{isArabic ? 'جدول زيارات الحجز' : 'Visit Schedule'}</h4>
                                            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                                {booking.visit_schedule.map((v, idx) => (
                                                    <div key={idx} className="flex justify-between items-center p-3 border border-gray-100 bg-gray-50/50 rounded-2xl transition-colors hover:bg-gray-50">
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800">{v.visit_date} ({isArabic ? translateDay(v.visit_day) : v.visit_day})</p>
                                                            <p className="text-xs text-gray-400 mt-0.5">{v.start_time} - {v.end_time} ({v.duration} {isArabic ? 'ساعة' : 'hours'})</p>
                                                        </div>
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_STYLES[v.visit_status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                            {t(`status.${v.visit_status}`, v.visit_status)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Ratings & reviews on the booking */}
                                    {booking.reviews && (booking.reviews.service || booking.reviews.workers?.length > 0) && (
                                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                            <h4 className="text-sm font-bold text-gray-700 mb-4">{isArabic ? 'تقييمات وتعليقات العميل' : 'Customer Feedback'}</h4>
                                            {booking.reviews.service && (
                                                <div className="mb-4 pb-4 border-b border-gray-50">
                                                    <p className="text-sm font-bold text-gray-800">{isArabic ? 'تقييم الخدمة' : 'Service Rating'}</p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="text-amber-500 font-bold text-sm">★ {booking.reviews.service.rating} / 5</span>
                                                        <span className="text-xs text-gray-400">({booking.reviews.service.percentage}%)</span>
                                                    </div>
                                                    {booking.reviews.service.comment && (
                                                        <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-100 mt-2 italic leading-relaxed">
                                                            "{booking.reviews.service.comment}"
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {booking.reviews.workers && booking.reviews.workers.length > 0 && (
                                                <div className="space-y-3">
                                                    <p className="text-sm font-bold text-gray-800">{isArabic ? 'تقييم العاملات' : 'Workers Ratings'}</p>
                                                    {booking.reviews.workers.map((w, idx) => (
                                                        <div key={idx} className="p-3 border border-gray-100 bg-gray-50/50 rounded-2xl">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm font-bold text-gray-700">{w.worker_name}</span>
                                                                <span className="text-amber-500 font-bold text-xs">★ {w.rating} / 5</span>
                                                            </div>
                                                            {w.comment && (
                                                                <p className="text-xs text-gray-600 bg-white p-2.5 rounded-xl border border-gray-100 mt-1.5 italic leading-relaxed">
                                                                    "{w.comment}"
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Cancellation Details */}
                                    {booking.status === 'cancelled' && (
                                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                            <h4 className="text-sm font-bold text-gray-700 mb-4">{isArabic ? 'تفاصيل إلغاء الحجز' : 'Cancellation Details'}</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm mb-4">
                                                {booking.cancelled_by && (
                                                    <Row label={isArabic ? 'تم الإلغاء بواسطة' : 'Cancelled By'} value={booking.cancelled_by === 'admin' ? (isArabic ? 'الإدارة' : 'Admin') : (isArabic ? 'العميل' : 'Customer')} />
                                                )}
                                                {booking.cancelled_at && (
                                                    <Row label={isArabic ? 'وقت الإلغاء' : 'Cancellation Time'} value={booking.cancelled_at} />
                                                )}
                                                {booking.cancellation_reason && (
                                                    <Row label={isArabic ? 'سبب الإلغاء' : 'Cancellation Reason'} value={booking.cancellation_reason} />
                                                )}
                                            </div>
                                            
                                            {booking.refund_status && (
                                                <div className="border-t border-gray-50 pt-4 mt-2 space-y-1.5">
                                                    <Row label={isArabic ? 'حالة الاسترداد' : 'Refund Status'} value={
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                            booking.refund_status === 'completed' 
                                                            ? 'bg-green-50 text-green-700 border-green-200' 
                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                            {booking.refund_status}
                                                        </span>
                                                    } />
                                                    {booking.refund_amount > 0 && (
                                                        <Row label={isArabic ? 'المبلغ المسترد' : 'Refunded Amount'} value={`${booking.refund_amount} ${booking.price_summary?.currency || 'EGP'}`} />
                                                    )}
                                                    {booking.refund_points > 0 && (
                                                        <Row label={isArabic ? 'النقاط المستردة' : 'Refunded Points'} value={booking.refund_points} />
                                                    )}
                                                    {booking.refund_destination && (
                                                        <Row label={isArabic ? 'وجهة الاسترداد' : 'Refund Destination'} value={booking.refund_destination} />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Address specifications */}
                                    {booking.address && (
                                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                            <h4 className="text-sm font-bold text-gray-700 mb-4">{t('details.address')}</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm">
                                                <Row label={t('details.label')} value={booking.address.label} />
                                                <Row label={t('details.phone')} value={booking.address.phone} />
                                                <div className="sm:col-span-2">
                                                    <Row label={t('details.address_line')} value={booking.address.line} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Price Details summary */}
                                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                        <h4 className="text-sm font-bold text-gray-700 mb-4">{t('details.price')}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm mb-4">
                                            <Row label={t('details.subtotal')} value={`${booking.price_summary?.subtotal} ${booking.price_summary?.currency}`} />
                                            <Row label={t('details.tax')} value={`${booking.price_summary?.tax} ${booking.price_summary?.currency}`} />
                                            
                                            {booking.price_summary?.service_discount_amount > 0 && (
                                                <Row label={isArabic ? 'خصم الخدمة' : 'Service Discount'} value={`-${booking.price_summary.service_discount_amount} ${booking.price_summary.currency}`} />
                                            )}
                                            {booking.price_summary?.coupon_discount_amount > 0 && (
                                                <Row label={`${isArabic ? 'خصم الكوبون' : 'Coupon Discount'} (${booking.price_summary.coupon_code || ''})`} value={`-${booking.price_summary.coupon_discount_amount} ${booking.price_summary.currency}`} />
                                            )}
                                            {booking.price_summary?.discount > 0 && !(booking.price_summary.service_discount_amount > 0 || booking.price_summary.coupon_discount_amount > 0) && (
                                                <Row label={t('details.discount')} value={`-${booking.price_summary.discount} ${booking.price_summary.currency}`} />
                                            )}

                                            {booking.price_summary?.payment_transaction_id && (
                                                <Row label={isArabic ? 'رقم المعاملة' : 'Transaction ID'} value={booking.price_summary.payment_transaction_id} />
                                            )}
                                            {booking.paid_points > 0 && (
                                                <Row label={isArabic ? 'النقاط المستخدمة' : 'Points Used'} value={booking.paid_points} />
                                            )}
                                            {booking.price_summary?.payment_method && (
                                                <Row label={isArabic ? 'طريقة الدفع' : 'Payment Method'} value={booking.price_summary.payment_method} />
                                            )}
                                        </div>

                                        <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-500">{t('details.total')}</span>
                                            <span className="text-lg font-black text-[#E91E63]">{booking.price_summary?.total} {booking.price_summary?.currency}</span>
                                        </div>
                                    </div>

                                    {/* Customer Special Notes */}
                                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                        <h4 className="text-sm font-bold text-gray-700 mb-2">{t('details.notes')}</h4>
                                        <p className="text-sm text-gray-500 leading-relaxed bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
                                            {booking.customer_notes || (isArabic ? 'لا توجد ملاحظات خاصة من العميل.' : 'No customer notes.')}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                    <h4 className="text-sm font-bold text-gray-700 mb-4">{t('details.activity_title')}</h4>
                                    {(booking.activity || []).length === 0 ? (
                                        <p className="text-sm text-gray-400 py-2">{t('details.no_activity')}</p>
                                    ) : (
                                        <ul className="space-y-4 relative border-s border-gray-100 ms-3">
                                            {booking.activity.map((a) => (
                                                <li key={a.id} className="mb-6 ms-6 relative">
                                                    <span className="absolute flex items-center justify-center w-6 h-6 bg-pink-50 text-[#E91E63] border border-pink-100 rounded-full -start-9 ring-4 ring-white">
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-gray-800">
                                                            <span className="text-gray-400 font-medium">{a.old_status ? t(`status.${a.old_status}`, a.old_status) : '—'}</span>
                                                            <span className="text-gray-400 px-1">→</span>
                                                            <span className="text-[#E91E63]">{t(`status.${a.new_status}`, a.new_status)}</span>
                                                        </p>
                                                        {a.note && <p className="text-xs text-gray-500 mt-1 italic">"{a.note}"</p>}
                                                        <p className="text-[10px] text-gray-400 mt-1 font-medium">{a.at} · {a.by || t('details.system')}</p>
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

            {/* Cancel confirmation modal dialog */}
            {cancelOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setCancelOpen(false)} />
                    <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <h4 className="text-lg font-bold text-gray-800 mb-2">{t('details.cancel_booking')}</h4>
                        <p className="text-sm text-gray-500 mb-4">{t('details.confirm_cancel')}</p>
                        <textarea
                            value={cancelNote}
                            onChange={(e) => setCancelNote(e.target.value)}
                            rows="3"
                            placeholder={t('details.cancel_reason')}
                            className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#E91E63] transition-all resize-none text-sm"
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setCancelOpen(false)} className="px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors text-sm">
                                {t('details.keep')}
                            </button>
                            <button 
                                onClick={confirmCancel} 
                                disabled={busy || !cancelNote.trim()} 
                                className="px-4 py-2 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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

    // Fetch eligible workers
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
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col font-main animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <h4 className="text-lg font-bold text-gray-800">
                        {isArabic ? 'تعيين وتغيير عمال الحجز' : 'Assign & Replace Booking Workers'}
                    </h4>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 outline-none">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {isArabic ? 'العمال المتاحون والمؤهلون' : 'Eligible & Available Workers'}
                        </label>

                        {isLoading ? (
                            <div className="py-6 flex justify-center">
                                <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                            </div>
                        ) : eligibleWorkers.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm bg-gray-50/50">
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
                                                ? 'border-[#E91E63] bg-[#FDF0F3]/30 shadow-sm' 
                                                : 'border-gray-100 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-semibold text-gray-800 truncate">{w.name}</span>
                                                <span className="text-xs text-gray-400 mt-0.5">{w.nationality || '—'} · ⭐ {w.avg_rating || '5.0'}</span>
                                            </div>
                                            <input 
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => {}} // toggling is handled by outer div
                                                className="w-4.5 h-4.5 rounded text-[#E91E63] border-gray-300 focus:ring-[#E91E63] cursor-pointer"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {isArabic ? 'سبب التغيير / ملاحظة (اختياري)' : 'Reason for change / Note (Optional)'}
                        </label>
                        <textarea 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows="2"
                            placeholder={isArabic ? 'مثال: استبدال العامل بسبب إجازة مرضية...' : 'e.g. Replacing worker due to sick leave...'}
                            className="w-full px-3 py-2 border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#E91E63] rounded-xl outline-none text-sm transition-colors resize-none"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        {t('details.close')}
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSubmit} 
                        disabled={assignMutation.isPending || isLoading}
                        className="px-4 py-2 text-sm rounded-xl font-bold text-white bg-[#E91E63] hover:bg-[#D81B60] transition-colors disabled:opacity-50"
                    >
                        {isArabic ? 'حفظ التغييرات' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {showOverridePrompt && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowOverridePrompt(false)} />
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
