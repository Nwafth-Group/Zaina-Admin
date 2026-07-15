import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { FormSection, SelectField } from '../../components/form/FormKit';
import RescheduleBookingModal from './RescheduleBookingModal';

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
    <div className="flex justify-between gap-4 py-1.5">
        <span className="text-sm text-gray-500 shrink-0">{label}</span>
        <span className="text-sm font-medium text-gray-800 text-end">{value ?? '—'}</span>
    </div>
);

export default function BookingDetailsModal({ bookingId, onClose }) {
    const { t, i18n } = useTranslation('bookings');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('details'); // side-menu: 'details' | 'history'
    const [moreOpen, setMoreOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelNote, setCancelNote] = useState('');
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [rescheduleOpen, setRescheduleOpen] = useState(false);

    const { data: booking, isLoading } = useQuery({
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
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء تحديث الحالة.');
        },
    });

    const changeStatus = (status, note) => statusMutation.mutate({ status, ...(note ? { note } : {}) });

    const status = booking?.status;
    const isWorkingStatus = status === 'Upcoming' || status === 'inService';
    // A completed/cancelled booking is final — no status changes are offered.
    const isTerminal = status === 'completed' || status === 'cancelled';
    const busy = statusMutation.isPending;

    const getLocalDateString = () => {
        const d = new Date();
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
        return new Date() >= end;
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
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-start ${active ? 'bg-[#FDF0F3] text-[#E91E63]' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                </svg>
                {label}
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-col font-main">

            {/* Header */}
            <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 bg-white border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                    <h3 className="text-xl font-bold text-gray-800 truncate">
                        {t('details.title')} {booking && <span className="font-mono text-base text-gray-500">{booking.booking_ref}</span>}
                    </h3>
                    {status && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${STATUS_STYLES[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {t(`status.${status}`, status)}
                        </span>
                    )}
                    {booking?.payment_status && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${PAYMENT_STYLES[booking.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                            {t(`payment.${booking.payment_status}`, booking.payment_status)}
                        </span>
                    )}
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors" aria-label={t('details.close')}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Action bar — only once the booking has loaded and is still active
                (no inputs shown while data is still loading, none once final). */}
            {booking && !isTerminal && (
                <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-3">
                    <div className="w-full max-w-4xl mx-auto flex flex-wrap items-center gap-3">
                        {/* Status dropdown: Upcoming / In service */}
                        <div className="min-w-[160px]">
                            <SelectField
                                registration={{
                                    value: isWorkingStatus ? status : '',
                                    onChange: (e) => e.target.value && changeStatus(e.target.value),
                                }}
                                disabled={busy}
                            >
                                {!isWorkingStatus && <option value="" disabled>—</option>}
                                <option value="Upcoming" disabled={status === 'inService'}>
                                    {t('status.Upcoming')}
                                </option>
                                <option value="inService" disabled={!isToday}>
                                    {t('status.inService')} {!isToday && (isArabic ? ' (يوم الخدمة فقط)' : ' (Service day only)')}
                                </option>
                            </SelectField>
                        </div>

                        {/* Mark as completed */}
                        <button
                            type="button"
                            onClick={() => changeStatus('completed')}
                            disabled={busy || !isEndTimePassed}
                            title={!isEndTimePassed ? (isArabic ? 'متاح فقط بعد انتهاء وقت الخدمة' : 'Only available after the service end time has passed') : ''}
                            className="px-4 py-2.5 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                        >
                            {t('details.mark_completed')}
                        </button>

                        {/* More menu: cancel */}
                        <div className="relative ms-auto">
                            <button
                                type="button"
                                onClick={() => setMoreOpen((o) => !o)}
                                aria-label={t('details.more')}
                                className="inline-flex items-center justify-center border border-gray-200 rounded-lg p-2.5 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                            {moreOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                                    <div className="absolute end-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                                        <button
                                            type="button"
                                            onClick={() => { setCancelOpen(true); setMoreOpen(false); }}
                                            className="w-full text-start px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {t('details.cancel_booking')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Body — side menu (details / history) + content panel */}
            <div className="flex-1 overflow-y-auto">
                {isLoading || !booking ? (
                    <div className="flex justify-center items-center h-full">
                        <svg className="animate-spin h-8 w-8 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                    </div>
                ) : (
                    <div className="w-full max-w-4xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">

                        {/* Side menu */}
                        <nav className="md:w-56 shrink-0 flex md:flex-col gap-1">
                            {sideMenuItem('details', t('menu.details'), 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z')}
                            {sideMenuItem('history', t('menu.history'), 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z')}
                        </nav>

                        {/* Content panel */}
                        <div className="flex-1 min-w-0 space-y-6">
                            {activeTab === 'details' ? (
                                <>
                                    <FormSection icon="user" title={t('details.customer')}>
                                        <Row label={t('details.name')} value={booking.customer?.name} />
                                        <Row label={t('details.phone')} value={booking.customer?.phone} />
                                        <Row label={t('details.email')} value={booking.customer?.email} />
                                        {booking.contract_id && (
                                            <Row label={isArabic ? 'رقم العقد' : 'Contract ID'} value={booking.contract_id} />
                                        )}
                                        {booking.created_at && (
                                            <Row label={isArabic ? 'تاريخ الإنشاء' : 'Created At'} value={booking.created_at} />
                                        )}
                                    </FormSection>

                                    <FormSection 
                                        icon="sparkles" 
                                        title={t('details.service')}
                                        action={!isTerminal && (
                                            <div className="flex gap-2">
                                                <button 
                                                    type="button" 
                                                    onClick={() => setRescheduleOpen(true)}
                                                    className="text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg shadow-sm transition-all duration-200 border border-gray-200"
                                                >
                                                    {isArabic ? 'إعادة جدولة' : 'Reschedule'}
                                                </button>
                                            </div>
                                        )}
                                    >
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
                                    </FormSection>

                                    {/* Dedicated Workers Section */}
                                    <FormSection
                                        icon="user"
                                        title={isArabic ? 'العاملات المعينات' : 'Assigned Workers'}
                                        action={!isTerminal && (
                                            <button 
                                                type="button" 
                                                onClick={() => setAssignModalOpen(true)}
                                                className="text-xs font-bold text-white bg-[#E91E63] hover:bg-[#D81B60] px-3 py-1.5 rounded-lg shadow-sm transition-all duration-200"
                                            >
                                                {booking.workers?.length ? (isArabic ? 'تغيير العمال' : 'Replace Workers') : (isArabic ? 'تعيين عمال' : 'Assign Workers')}
                                            </button>
                                        )}
                                    >
                                        {booking.workers && booking.workers.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                                                {booking.workers.map((w) => (
                                                    <div key={w.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                                                        <div className="w-10 h-10 rounded-full bg-[#FDF0F3] text-[#E91E63] flex items-center justify-center font-bold text-base shrink-0">
                                                            {w.name?.charAt(0) || '?'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-gray-800 truncate">{w.name}</p>
                                                            <p className="text-xs text-gray-505">{isArabic ? 'الجنسية: ' : 'Nationality: '}{w.nationality || '—'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 py-1">{isArabic ? 'لم يتم تعيين عاملات بعد.' : 'No workers assigned yet.'}</p>
                                        )}
                                    </FormSection>

                                    {booking.status === 'cancelled' && (
                                        <FormSection icon="info" title={isArabic ? 'تفاصيل الإلغاء والاسترداد' : 'Cancellation & Refund Details'}>
                                            {booking.cancelled_by && (
                                                <Row label={isArabic ? 'تم الإلغاء بواسطة' : 'Cancelled By'} value={booking.cancelled_by === 'admin' ? (isArabic ? 'الإدارة' : 'Admin') : (isArabic ? 'العميل' : 'Customer')} />
                                            )}
                                            {booking.cancelled_at && (
                                                <Row label={isArabic ? 'وقت الإلغاء' : 'Cancellation Time'} value={booking.cancelled_at} />
                                            )}
                                            {booking.cancellation_reason && (
                                                <Row label={isArabic ? 'سبب الإلغاء' : 'Cancellation Reason'} value={booking.cancellation_reason} />
                                            )}
                                            
                                            {/* Refund section */}
                                            {booking.refund_status && (
                                                <div className="border-t border-gray-100 mt-2 pt-2 space-y-2">
                                                    <Row label={isArabic ? 'حالة الاسترداد' : 'Refund Status'} value={
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
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
                                        </FormSection>
                                    )}

                                    {booking.reviews && (booking.reviews.service || booking.reviews.workers?.length > 0) && (
                                        <FormSection icon="star" title={isArabic ? 'تقييمات الحجز' : 'Booking Ratings'}>
                                            {booking.reviews.service && (
                                                <div className="mb-3 pb-3 border-b border-gray-100">
                                                    <p className="text-sm font-semibold text-gray-800">{isArabic ? 'تقييم الخدمة' : 'Service Rating'}</p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="text-amber-500 font-bold text-sm">★ {booking.reviews.service.rating} / 5</span>
                                                        <span className="text-xs text-gray-400">({booking.reviews.service.percentage}%)</span>
                                                    </div>
                                                    {booking.reviews.service.comment && (
                                                        <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mt-2 italic">
                                                            "{booking.reviews.service.comment}"
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {booking.reviews.workers && booking.reviews.workers.length > 0 && (
                                                <div className="space-y-3">
                                                    <p className="text-sm font-semibold text-gray-800">{isArabic ? 'تقييم العاملات' : 'Workers Ratings'}</p>
                                                    {booking.reviews.workers.map((w, idx) => (
                                                        <div key={idx} className="p-3 border border-gray-100 bg-gray-50/50 rounded-xl">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm font-semibold text-gray-700">{w.worker_name}</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-amber-500 font-bold text-xs">★ {w.rating} / 5</span>
                                                                </div>
                                                            </div>
                                                            {w.comment && (
                                                                <p className="text-xs text-gray-600 bg-white p-2 rounded-lg border border-gray-100 mt-1.5 italic">
                                                                    "{w.comment}"
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </FormSection>
                                    )}

                                    {booking.visit_schedule && booking.visit_schedule.length > 0 && (
                                        <FormSection icon="calendar" title={isArabic ? 'جدول الزيارات' : 'Visit Schedule'}>
                                            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                                                {booking.visit_schedule.map((v, idx) => {
                                                    const translateDay = (dayName) => {
                                                        const m = {
                                                            'Monday': 'الإثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء',
                                                            'Thursday': 'الخميس', 'Friday': 'الجمعة', 'Saturday': 'السبت', 'Sunday': 'الأحد'
                                                        };
                                                        return m[dayName] || dayName;
                                                    };
                                                    return (
                                                        <div key={idx} className="flex justify-between items-center p-3 border border-gray-100 bg-gray-50/50 rounded-xl">
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-800">{v.visit_date} ({isArabic ? translateDay(v.visit_day) : v.visit_day})</p>
                                                                <p className="text-xs text-gray-500 mt-0.5">{v.start_time} - {v.end_time} ({v.duration} {isArabic ? 'ساعة' : 'hours'})</p>
                                                            </div>
                                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_STYLES[v.visit_status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                                {t(`status.${v.visit_status}`, v.visit_status)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </FormSection>
                                    )}

                                    {booking.address && (
                                        <FormSection icon="location" title={t('details.address')}>
                                            <Row label={t('details.label')} value={booking.address.label} />
                                            <Row label={t('details.address_line')} value={booking.address.line} />
                                            <Row label={t('details.phone')} value={booking.address.phone} />
                                        </FormSection>
                                    )}

                                    <FormSection icon="info" title={t('details.price')}>
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

                                        <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between items-center">
                                            <span className="text-sm font-semibold text-gray-700">{t('details.total')}</span>
                                            <span className="text-base font-bold text-[#E91E63]">{booking.price_summary?.total} {booking.price_summary?.currency}</span>
                                        </div>
                                        
                                        {booking.price_summary?.payment_transaction_id && (
                                            <Row label={isArabic ? 'رقم المعاملة' : 'Transaction ID'} value={booking.price_summary.payment_transaction_id} />
                                        )}

                                        {booking.paid_points > 0 && (
                                            <Row label={isArabic ? 'النقاط المستخدمة' : 'Points Used'} value={booking.paid_points} />
                                        )}

                                        {booking.price_summary?.payment_method && (
                                            <Row label={isArabic ? 'طريقة الدفع' : 'Payment Method'} value={booking.price_summary.payment_method} />
                                        )}
                                        
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-sm text-gray-500">{t('table.payment')}</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${PAYMENT_STYLES[booking.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                                                {t(`payment.${booking.payment_status}`, booking.payment_status)}
                                            </span>
                                        </div>
                                    </FormSection>

                                    <FormSection icon="info" title={t('details.notes')}>
                                        <p className="text-sm text-gray-600">{booking.customer_notes || (isArabic ? 'لا توجد ملاحظات من العميل.' : 'No customer notes.')}</p>
                                    </FormSection>
                                </>
                            ) : (
                                <FormSection icon="clock" title={t('details.activity_title')}>
                                    {(booking.activity || []).length === 0 ? (
                                        <p className="text-sm text-gray-400">{t('details.no_activity')}</p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {booking.activity.map((a) => (
                                                <li key={a.id} className="flex gap-3">
                                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#E91E63]" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-gray-700">
                                                            <span className="font-medium">{a.old_status ? t(`status.${a.old_status}`, a.old_status) : '—'}</span>
                                                            {' → '}
                                                            <span className="font-medium">{t(`status.${a.new_status}`, a.new_status)}</span>
                                                        </p>
                                                        {a.note && <p className="text-xs text-gray-500 mt-0.5">{a.note}</p>}
                                                        <p className="text-xs text-gray-400 mt-0.5">{a.at} · {a.by || t('details.system')}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </FormSection>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Cancel confirmation */}
            {cancelOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setCancelOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h4 className="text-lg font-bold text-gray-800 mb-2">{t('details.cancel_booking')}</h4>
                        <p className="text-sm text-gray-500 mb-4">{t('details.confirm_cancel')}</p>
                        <textarea
                            value={cancelNote}
                            onChange={(e) => setCancelNote(e.target.value)}
                            rows="3"
                            placeholder={t('details.cancel_reason')}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#E91E63] transition-colors mb-4"
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setCancelOpen(false)} className="px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                                {t('details.keep')}
                            </button>
                            <button 
                                onClick={confirmCancel} 
                                disabled={busy || !cancelNote.trim()} 
                                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            // If the backend validation fails due to time conflict/started service, we check if we can override
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

    const STATUS_STYLES_WORKERS = {
        active: 'bg-green-100 text-green-700',
        inactive: 'bg-gray-100 text-gray-600',
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col font-main animate-fade-in">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                    <h4 className="text-lg font-bold text-gray-800">
                        {isArabic ? 'تعيين وتغيير عمال الحجز' : 'Assign & Replace Booking Workers'}
                    </h4>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
                    {/* Eligible Workers list */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            {isArabic ? 'العمال المتاحون والمؤهلون' : 'Eligible & Available Workers'}
                        </label>

                        {isLoading ? (
                            <div className="py-6 flex justify-center">
                                <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                            </div>
                        ) : eligibleWorkers.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-gray-200 rounded-xl text-gray-400 text-sm bg-gray-50/50">
                                {isArabic ? 'لا يوجد عمال مؤهلون متاحون لهذا الوقت.' : 'No eligible workers available for this time slot.'}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[240px] overflow-y-auto p-1.5 border border-gray-100 rounded-lg">
                                {eligibleWorkers.map((w) => {
                                    const checked = selectedIds.includes(w.id);
                                    return (
                                        <div 
                                            key={w.id} 
                                            onClick={() => toggleWorker(w.id)}
                                            className={`p-3 border rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-between ${
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

                    {/* Change Note */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {isArabic ? 'سبب التغيير / ملاحظة (اختياري)' : 'Reason for change / Note (Optional)'}
                        </label>
                        <textarea 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows="2"
                            placeholder={isArabic ? 'مثال: استبدال العامل بسبب إجازة مرضية...' : 'e.g. Replacing worker due to sick leave...'}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#E91E63] text-sm transition-colors resize-none"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {t('details.close')}
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSubmit} 
                        disabled={assignMutation.isPending || isLoading}
                        className="px-4 py-2 text-sm rounded-lg font-medium text-white bg-[#E91E63] hover:bg-[#D81B60] transition-colors disabled:opacity-50"
                    >
                        {isArabic ? 'حفظ التغييرات' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Overlapping/Time-passed Confirmation Alert Dialog */}
            {showOverridePrompt && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowOverridePrompt(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
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
                                className="px-3.5 py-1.5 text-xs rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button 
                                onClick={handleOverrideConfirm} 
                                className="px-3.5 py-1.5 text-xs rounded-lg font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors"
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
