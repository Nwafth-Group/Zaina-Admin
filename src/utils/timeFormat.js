/**
 * Time formatting utilities with Arabic localization and BiDi protection.
 */

/**
 * Format 24-hour time string (e.g. "08:00", "14:30:00") to 12-hour format with localized AM/PM.
 * In Arabic: "8:00 ص" or "2:30 م"
 * In English: "8:00 AM" or "2:30 PM"
 */
export const format12Hour = (timeStr, isArabic = false) => {
    if (!timeStr || timeStr === '—' || timeStr === 'غير محدد') return timeStr || '—';
    const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (!match) return timeStr;
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const isPM = hours >= 12;
    const period = isArabic ? (isPM ? 'م' : 'ص') : (isPM ? 'PM' : 'AM');
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${period}`;
};

/**
 * Format a time range with proper localization and BiDi direction protection.
 * In Arabic: "من 8:00 ص إلى 12:00 م"
 * In English: "8:00 AM - 12:00 PM"
 */
export const formatTimeRange = (startStr, endStr, isArabic = false) => {
    if (!startStr && !endStr) return '—';
    if (!endStr) return format12Hour(startStr, isArabic);
    if (!startStr) return format12Hour(endStr, isArabic);

    const formattedStart = format12Hour(startStr, isArabic);
    const formattedEnd = format12Hour(endStr, isArabic);

    if (isArabic) {
        return `من ${formattedStart} إلى ${formattedEnd}`;
    }
    return `${formattedStart} - ${formattedEnd}`;
};
