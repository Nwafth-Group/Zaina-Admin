import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

export default function RescheduleBookingModal({ booking, onClose }) {
    const { t, i18n } = useTranslation('bookings');
    const queryClient = useQueryClient();
    const isArabic = i18n.language?.startsWith('ar');

    const isThreeVisits = booking.visit_type === 'three_visits_per_week' || booking.visit_type === '3_days_per_week';

    // Parse initial dates from schedule
    const initialDates = (booking.visit_schedule || []).map(v => v.visit_date);
    if (initialDates.length === 0 && booking.booking_date) {
        initialDates.push(booking.booking_date);
    }
    
    // Parse initial start time
    const getInitialTime = () => {
        if (booking.visit_schedule?.[0]?.start_time) {
            return booking.visit_schedule[0].start_time.substring(0, 5);
        }
        if (booking.start_time) {
            return booking.start_time.substring(0, 5);
        }
        // If time_slot is e.g. "09:00 AM - 11:00 AM", we can parse it
        if (booking.time_slot) {
            const match = booking.time_slot.match(/^(\d{2}:\d{2})/);
            if (match) return match[1];
        }
        return '09:00';
    };

    const [dates, setDates] = useState(isThreeVisits ? [initialDates[0] || '', initialDates[1] || '', initialDates[2] || ''] : [initialDates[0] || '']);
    const [startTime, setStartTime] = useState(getInitialTime());
    const [validationError, setValidationError] = useState('');

    const handleDateChange = (index, value) => {
        setDates(prev => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
        setValidationError('');
    };

    // Reschedule mutation
    const rescheduleMutation = useMutation({
        mutationFn: (payload) => axiosInstance.post(`/admin/bookings/${booking.id}/reschedule`, payload),
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم إعادة جدولة الحجز بنجاح.' : 'Booking rescheduled successfully.'));
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', booking.id] });
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
            setValidationError(isArabic ? 'يرجى اختيار وقت بدء الخدمة.' : 'Please select a start time.');
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

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 font-main">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-3">
                    <h4 className="text-lg font-bold text-gray-800">
                        {isArabic ? 'إعادة جدولة الحجز' : 'Reschedule Booking'}
                    </h4>
                    <span className="font-mono text-xs font-bold text-[#E91E63] bg-[#FDF0F3] px-2 py-0.5 rounded border border-[#FAD2DC]">
                        {booking.booking_ref}
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Validation Banner */}
                    {validationError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
                            ⚠️ {validationError}
                        </div>
                    )}

                    {/* Date Pickers */}
                    <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-600 uppercase">
                            {isThreeVisits 
                                ? (isArabic ? 'تواريخ الزيارات الثلاث' : 'Three Visit Dates') 
                                : (isArabic ? 'تاريخ الزيارة' : 'Visit Date')
                            }
                        </label>
                        {dates.map((dateVal, idx) => (
                            <div key={idx} className="space-y-1">
                                {isThreeVisits && (
                                    <span className="text-[10px] font-semibold text-gray-400">
                                        {isArabic ? `الزيارة #${idx + 1}` : `Visit #${idx + 1}`}
                                    </span>
                                )}
                                <input
                                    type="date"
                                    value={dateVal}
                                    onChange={(e) => handleDateChange(idx, e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#E91E63] transition-colors text-sm"
                                    required
                                />
                            </div>
                        ))}
                    </div>

                    {/* Start Time */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                            {isArabic ? 'وقت بدء الخدمة' : 'Service Start Time'}
                        </label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => { setStartTime(e.target.value); setValidationError(''); }}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#E91E63] transition-colors text-sm font-mono"
                            required
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-50 mt-5">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                        >
                            {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={rescheduleMutation.isPending}
                            className="px-5 py-2 rounded-lg font-medium text-white bg-[#E91E63] hover:bg-[#D81B60] transition-colors disabled:opacity-50 flex items-center gap-2 text-sm shadow-sm"
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
