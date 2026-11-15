import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper to get the start of Saturday-to-Friday week
const getSaturdayStartStr = (dateStr) => {
    if (!dateStr) return '';
    const d = parseLocalDate(dateStr);
    const day = d.getDay(); // 0 (Sun) to 6 (Sat)
    const daysFromSaturday = (day + 1) % 7; // Saturday(6) -> 0, Sunday(0) -> 1, ..., Friday(5) -> 6
    const satDate = new Date(d);
    satDate.setDate(d.getDate() - daysFromSaturday);
    
    const year = satDate.getFullYear();
    const month = String(satDate.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(satDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
};

export default function RescheduleBookingModal({ booking, onClose, onSuccess }) {
    const { t, i18n } = useTranslation('bookings');
    const queryClient = useQueryClient();
    const isArabic = i18n.language?.startsWith('ar');

    const isThreeVisits = booking.visit_type === 'three_visits_per_week' || booking.visit_type === '3_days_per_week';

    // Parse initial dates from schedule
    const initialDates = (booking.visit_schedule || []).map(v => v.visit_date);
    if (initialDates.length === 0 && (booking.raw_booking_date || booking.booking_date)) {
        initialDates.push(booking.raw_booking_date || booking.booking_date);
    }
    
    // Parse initial start time
    const getInitialTime = () => {
        if (booking.raw_start_time) {
            return booking.raw_start_time.substring(0, 5);
        }
        if (booking.visit_schedule?.[0]?.start_time) {
            return booking.visit_schedule[0].start_time.substring(0, 5);
        }
        if (booking.start_time) {
            return booking.start_time.substring(0, 5);
        }
        if (booking.time_slot) {
            const match = booking.time_slot.match(/^(\d{2}:\d{2})/);
            if (match) return match[1];
        }
        return '08:00';
    };

    const [dates, setDates] = useState(isThreeVisits ? [initialDates[0] || '', initialDates[1] || '', initialDates[2] || ''] : [initialDates[0] || '']);
    const [startTime, setStartTime] = useState(getInitialTime());
    const [showCustomTime, setShowCustomTime] = useState(false);
    const [validationError, setValidationError] = useState('');

    const primaryDate = dates[0] || '';

    // Fetch shifts for the selected service and date
    const { data: shiftsData, isLoading: isLoadingShifts } = useQuery({
        queryKey: ['booking-reschedule-shifts', booking.id, primaryDate],
        queryFn: async () => {
            if (!booking?.id || !primaryDate) return null;
            const res = await axiosInstance.get(`/admin/bookings/${booking.id}/reschedule-shifts`, {
                params: { date: primaryDate }
            });
            return res.data?.data || null;
        },
        enabled: !!booking?.id && !!primaryDate,
    });

    const shifts = shiftsData?.shifts || [];
    const hasDiscreteShifts = shiftsData?.has_discrete_shifts || false;
    const durationMinutes = shiftsData?.duration_minutes || booking.duration_minutes || 120;

    // Auto-select shift if startTime matches one
    useEffect(() => {
        if (hasDiscreteShifts && shifts.length > 0 && !startTime) {
            setStartTime(shifts[0].start_time);
        }
    }, [hasDiscreteShifts, shifts, startTime]);

    const handleDateChange = (index, value) => {
        setDates(prev => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
        setValidationError('');
    };

    const handleSelectShift = (shift) => {
        setStartTime(shift.start_time);
        setValidationError('');
    };

    // Format 24-hr time string (HH:mm) to localized display string
    const formatTimeDisplay = (timeStr) => {
        if (!timeStr) return '';
        const parts = timeStr.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1] || '0', 10);
        const isPM = h >= 12;
        const displayH = h % 12 || 12;
        const period = isArabic ? (isPM ? 'م' : 'ص') : (isPM ? 'PM' : 'AM');
        return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    };

    // Calculate end time string from start time and duration
    const calculateEndTimeDisplay = (startStr, durationMin) => {
        if (!startStr) return '';
        const parts = startStr.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1] || '0', 10);
        const totalMin = h * 60 + m + (durationMin || 120);
        const endH = Math.floor(totalMin / 60) % 24;
        const endM = totalMin % 60;
        const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        return formatTimeDisplay(endStr);
    };

    // Reschedule mutation
    const rescheduleMutation = useMutation({
        mutationFn: (payload) => axiosInstance.post(`/admin/bookings/${booking.id}/reschedule`, payload),
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم إعادة جدولة الحجز بنجاح.' : 'Booking rescheduled successfully.'));
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail'] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', String(booking.id)] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', Number(booking.id)] });
            queryClient.invalidateQueries({ queryKey: ['dailyOperations'] });
            queryClient.invalidateQueries({ queryKey: ['transportDispatch'] });
            onSuccess?.();
            onClose();
        },
        onError: (error) => {
            setValidationError(error.response?.data?.message || (isArabic ? 'حدث خطأ أثناء إعادة الجدولة.' : 'An error occurred during reschedule.'));
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setValidationError('');

        // Basic checks
        if (dates.some(d => !d)) {
            setValidationError(isArabic ? 'يرجى ملء جميع تواريخ الزيارات.' : 'Please select all visit dates.');
            return;
        }
        if (!startTime) {
            setValidationError(isArabic ? 'يرجى اختيار وردية أو وقت بدء الخدمة.' : 'Please select a shift or start time.');
            return;
        }

        // Validate 3-visit Saturday-to-Friday week constraints
        if (isThreeVisits) {
            const satStart1 = getSaturdayStartStr(dates[0]);
            const satStart2 = getSaturdayStartStr(dates[1]);
            const satStart3 = getSaturdayStartStr(dates[2]);

            if (satStart1 !== satStart2 || satStart1 !== satStart3) {
                setValidationError(isArabic 
                    ? 'يجب أن تقع جميع الزيارات الثلاث في نفس الأسبوع (من السبت إلى الجمعة).' 
                    : 'All three visits must belong to the same calendar week (Saturday to Friday).'
                );
                return;
            }

            // Check uniqueness of dates
            const uniqueDates = new Set(dates);
            if (uniqueDates.size !== 3) {
                setValidationError(isArabic 
                    ? 'يجب أن تقع الزيارات في ثلاثة أيام مختلفة.' 
                    : 'The three visits must be on different days.'
                );
                return;
            }
        }

        rescheduleMutation.mutate({
            dates,
            start_time: startTime
        });
    };

    const serviceName = booking.service_name || booking.service?.name_ar || booking.service?.name_en || '';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 font-main max-h-[92vh] overflow-y-auto">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                    <div>
                        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span>{isArabic ? 'إعادة جدولة الحجز' : 'Reschedule Booking'}</span>
                        </h4>
                        {serviceName && (
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                {serviceName}
                            </p>
                        )}
                    </div>
                    <span className="font-mono text-xs font-bold text-[#E91E63] bg-[#FDF0F3] px-2.5 py-1 rounded-lg border border-[#FAD2DC]">
                        {booking.booking_ref}
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Validation Banner */}
                    {validationError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                            <span className="text-sm">⚠️</span>
                            <span>{validationError}</span>
                        </div>
                    )}

                    {/* Date Pickers */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                            {isThreeVisits 
                                ? (isArabic ? 'تواريخ الزيارات الثلاث' : 'Three Visit Dates') 
                                : (isArabic ? 'تاريخ الزيارة الجديدة' : 'New Visit Date')
                            }
                        </label>
                        {dates.map((dateVal, idx) => (
                            <div key={idx} className="space-y-1">
                                {isThreeVisits && (
                                    <span className="text-[11px] font-semibold text-gray-500">
                                        {isArabic ? `الزيارة رقم ${idx + 1}` : `Visit #${idx + 1}`}
                                    </span>
                                )}
                                <input
                                    type="date"
                                    value={dateVal}
                                    onChange={(e) => handleDateChange(idx, e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#E91E63] focus:ring-2 focus:ring-[#E91E63]/10 transition-colors text-sm font-medium"
                                    required
                                />
                            </div>
                        ))}
                    </div>

                    {/* Shift Selection Section (Only for services that have shifts) */}
                    {hasDiscreteShifts && shifts.length > 0 ? (
                        <div className="space-y-2.5 pt-1">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    {isArabic ? 'ورديات الخدمة' : 'Service Shifts'}
                                </label>
                                {isLoadingShifts && (
                                    <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
                                        <svg className="animate-spin h-3.5 w-3.5 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" />
                                        </svg>
                                        {isArabic ? 'جاري تحميل الورديات...' : 'Loading shifts...'}
                                    </span>
                                )}
                            </div>

                            {/* Discrete Shifts Cards (Morning / Evening, etc.) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {shifts.map((shift) => {
                                    const isSelected = startTime === shift.start_time;
                                    const isMorning = shift.period_type === 'morning';

                                    return (
                                        <button
                                            key={shift.id || `${shift.start_time}-${shift.end_time}`}
                                            type="button"
                                            onClick={() => handleSelectShift(shift)}
                                            className={`p-3 rounded-xl border text-start transition-all cursor-pointer flex items-center gap-3 relative ${
                                                isSelected
                                                    ? 'border-[#E91E63] bg-[#FDF0F3] shadow-xs ring-1 ring-[#E91E63]'
                                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/70'
                                            }`}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                isSelected 
                                                    ? 'bg-[#E91E63] text-white shadow-xs' 
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {isMorning ? (
                                                    <span className="text-base">☀️</span>
                                                ) : (
                                                    <span className="text-base">🌙</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#E91E63]' : 'text-gray-800'}`}>
                                                        {isArabic ? (shift.period_type === 'morning' ? 'الوردية الصباحية' : 'الوردية المسائية') : (shift.period_type === 'morning' ? 'Morning Shift' : 'Evening Shift')}
                                                    </p>
                                                    {isSelected && (
                                                        <span className="text-[#E91E63] text-xs font-bold shrink-0">✓</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                                                    {shift.label}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Selected Time Summary Badge */}
                            {startTime && (
                                <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                                        <span className="text-gray-400">⏱️</span>
                                        <span>{isArabic ? 'الموعد المحدد:' : 'Selected Window:'}</span>
                                        <span className="font-bold text-gray-900 font-mono">
                                            {formatTimeDisplay(startTime)} - {calculateEndTimeDisplay(startTime, durationMinutes)}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-semibold text-[#E91E63] bg-[#FDF0F3] px-2 py-0.5 rounded border border-[#FAD2DC]">
                                        {isArabic ? `${Math.round(durationMinutes / 60)} ساعة` : `${Math.round(durationMinutes / 60)} hrs`}
                                    </span>
                                </div>
                            )}

                            {/* Toggle Custom Manual Time */}
                            <div className="pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowCustomTime(!showCustomTime)}
                                    className="text-[11px] font-semibold text-[#E91E63] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <span>{showCustomTime ? (isArabic ? 'إخفاء الإدخال اليدوي للوقت' : 'Hide custom time input') : (isArabic ? '✏️ تعديل الوقت يدويًا' : '✏️ Edit time manually')}</span>
                                </button>

                                {showCustomTime && (
                                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                                        <label className="block text-[11px] font-semibold text-gray-600">
                                            {isArabic ? 'وقت البدء المخصص' : 'Custom Start Time'}
                                        </label>
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => { setStartTime(e.target.value); setValidationError(''); }}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E91E63] transition-colors text-sm font-mono"
                                            required
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Services that do NOT have shifts: Only Date & Time input as it was before */
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                {isArabic ? 'وقت بدء الخدمة' : 'Service Start Time'}
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => { setStartTime(e.target.value); setValidationError(''); }}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-[#E91E63] focus:ring-2 focus:ring-[#E91E63]/10 transition-colors text-sm font-mono"
                                required
                            />
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 mt-5">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm cursor-pointer"
                        >
                            {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={rescheduleMutation.isPending || !startTime}
                            className="px-5 py-2 rounded-xl font-medium text-white bg-[#E91E63] hover:bg-[#D81B60] transition-colors disabled:opacity-50 flex items-center gap-2 text-sm shadow-sm cursor-pointer"
                        >
                            {rescheduleMutation.isPending && (
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                                </svg>
                            )}
                            {isArabic ? 'تأكيد إعادة الجدولة' : 'Confirm Reschedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
