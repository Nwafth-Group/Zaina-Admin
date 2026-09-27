import React, { useState } from 'react';
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

const format12HourRange = (timeSlotStr) => {
    if (!timeSlotStr || timeSlotStr === '—') return '—';
    const parts = String(timeSlotStr).split('-').map(s => s.trim());
    if (parts.length === 2) {
        return `${format12Hour(parts[0])} - ${format12Hour(parts[1])}`;
    }
    return format12Hour(timeSlotStr);
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
    const shiftMins = parseTimeToMinutes(shiftStartTimeStr || '13:00');
    // Departure time must be at least 1 hour (60 mins) before shift start
    return Math.max(0, shiftMins - 60);
};

const formatMinutesTo12Hour = (totalMins) => {
    let hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${String(mins).padStart(2, '0')} ${ampm}`;
};

export default function TransportGroupDetails() {
    const [searchParams] = useSearchParams();
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const governorate = searchParams.get('governorate') || 'عمان';
    const area = searchParams.get('area') || '';

    const navigate = useNavigate();
    const { i18n } = useTranslation('common');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [activeGroup, setActiveGroup] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dispatchForm, setDispatchForm] = useState({
        departure_point_id: '',
        departure_time: '',
        driver_id: '',
        notes: '',
    });

    const { data: detailsData, isLoading } = useQuery({
        queryKey: ['transport-region-details', date, governorate, area],
        queryFn: async () => (await axiosInstance.get(`/admin/transport-dispatch/region-details?service_date=${date}&governorate=${encodeURIComponent(governorate)}&area=${encodeURIComponent(area)}`)).data,
    });

    const { data: pointsData } = useQuery({
        queryKey: ['departure-points-lookup'],
        queryFn: async () => (await axiosInstance.get('/admin/departure-points?per_page=100')).data,
    });

    const { data: driversData } = useQuery({
        queryKey: ['drivers-lookup'],
        queryFn: async () => (await axiosInstance.get('/admin/drivers?per_page=100')).data,
    });

    const departurePoints = pointsData?.data?.items || pointsData?.data || [];
    const drivers = driversData?.data?.items || driversData?.data || [];
    const regionInfo = detailsData?.data || { date, governorate, area, total_bookings: 0, total_workers: 0, groups: [] };

    const updateDispatchMutation = useMutation({
        mutationFn: async ({ groupId, payload }) => {
            return (await axiosInstance.put(`/admin/transport-dispatch/groups/${groupId}`, payload)).data;
        },
        onSuccess: (res) => {
            toast.success(res?.message || (isArabic ? 'تم تحديث بيانات الانطلاق بنجاح' : 'Dispatch info updated'));
            queryClient.invalidateQueries({ queryKey: ['transport-region-details'] });
            setIsModalOpen(false);
        },
        onError: (err) => {
            const serverMsg = err.response?.data?.errors?.driver_id?.[0]
                || err.response?.data?.errors?.departure_time?.[0]
                || err.response?.data?.message
                || (isArabic ? 'حدث خطأ أثناء الحفظ' : 'Error updating dispatch');
            toast.error(serverMsg);
        },
    });

    const openDispatchModal = (group) => {
        setActiveGroup(group);
        const maxMins = getMaxDepartureTimeMinutes(group.start_time);
        let defaultDep = group.departure_time ? format12Hour(group.departure_time) : formatMinutesTo12Hour(maxMins);
        if (parseTimeToMinutes(defaultDep) > maxMins) {
            defaultDep = formatMinutesTo12Hour(maxMins);
        }

        setDispatchForm({
            departure_point_id: group.departure_point?.id || (departurePoints[0]?.id ?? ''),
            departure_time: defaultDep,
            driver_id: group.driver?.id || (drivers[0]?.id ?? ''),
            notes: group.notes || '',
        });
        setIsModalOpen(true);
    };

    const handleDispatchSubmit = (e) => {
        e.preventDefault();
        if (!activeGroup) return;

        const maxMins = getMaxDepartureTimeMinutes(activeGroup.start_time);
        const selectedMins = parseTimeToMinutes(dispatchForm.departure_time);

        if (selectedMins > maxMins) {
            const maxFormatted = formatMinutesTo12Hour(maxMins);
            toast.error(
                isArabic 
                    ? `وقت الانطلاق يجب أن يكون قبل ساعة على الأقل من بداية الشفت (قبل ${maxFormatted})!` 
                    : `Departure time must be at least 1 hour before shift start (Before ${maxFormatted})!`
            );
            return;
        }

        updateDispatchMutation.mutate({
            groupId: activeGroup.group_id,
            payload: dispatchForm,
        });
    };

    const generateWhatsAppText = (group) => {
        const vehicleInfo = group.vehicle_type || group.driver?.vehicle_type 
            ? `\n🚐 المركبة: ${group.vehicle_type || group.driver?.vehicle_type} [${group.vehicle_plate || group.driver?.vehicle_plate || '—'}] (سعة: ${group.vehicle_capacity || group.driver?.vehicle_capacity || 5} ركاب)` 
            : '';
        let text = `*جدول نقل وسائقي العاملات*\n📅 التاريخ: ${date}\n📍 المنطقة: ${governorate} - ${area}\n⏱️ وقت بدء الخدمات: ${format12Hour(group.start_time)}\n🚀 وقت الانطلاق: ${format12Hour(group.departure_time) || 'غير محدد'}\n🚏 نقطة الانطلاق: ${group.departure_point?.name || 'غير محدودة'}\n👨‍✈️ السائق: ${group.driver?.name || 'غير محدد'}${vehicleInfo}\n👥 إجمالي الركاب: ${group.total_passengers || group.workers_list?.length}\n\n*بيانات التوصيل والعملاء:*\n`;

        group.workers_list.forEach((w, i) => {
            const timeRange = format12HourRange(w.visit_time || w.time_slot || `${w.start_time || ''} - ${w.end_time || ''}`);
            const teamBadge = w.team_name ? ` [فريق: ${w.team_name}]` : '';
            text += `${i + 1}. العاملة: ${w.name}${teamBadge} | العميل: ${w.booking_number} | الخدمة: ${w.service_name} (${timeRange}) | العنوان: ${w.service_address}\n`;
        });

        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handleExportBatchExcel = async (group) => {
        try {
            toast.loading(isArabic ? 'جاري إعداد ملف الإكسل...' : 'Preparing Excel file...', { id: 'export-toast' });
            const response = await axiosInstance.get(`/admin/transport-dispatch/groups/${group.group_id}/export-excel`, {
                responseType: 'blob',
            });

            const blob = new Blob([response.data], { type: 'application/vnd.ms-excel;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `transport_batch_${group.start_time}_${date}.xls`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success(isArabic ? 'تم تصدير ملف الإكسل بنجاح' : 'Excel file exported successfully', { id: 'export-toast' });
        } catch (err) {
            toast.error(isArabic ? 'حدث خطأ أثناء تصدير الملف' : 'Error exporting file', { id: 'export-toast' });
        }
    };

    if (isLoading) {
        return <div className="p-8  text-gray-500 font-bold">{isArabic ? 'جاري التحميل...' : 'Loading...'}</div>;
    }

    return (
                <div className="space-y-6 font-main w-full pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate('/transport-dispatch')}
                        className="text-xs text-gray-500 hover:text-[#E91E63] font-bold mb-1 flex items-center gap-1"
                    >
                        <span>←</span>
                        <span>{isArabic ? 'العودة لقائمة المناطق' : 'Back to Dispatch Overview'}</span>
                    </button>
                    <h1 className="text-xl font-black text-gray-900">
                        {governorate} - {area}
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">
                        {date}
                    </p>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500">{isArabic ? 'إجمالي الحجوزات بالمنطقة' : 'Total Bookings'}</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{regionInfo.total_bookings}</p>
                    </div>
                    <div className="text-2xl">📋</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500">{isArabic ? 'إجمالي العاملات المطلوبات' : 'Total Workers'}</p>
                        <p className="text-2xl font-black text-[#E91E63] mt-1">{regionInfo.total_workers}</p>
                    </div>
                    <div className="text-2xl">👩‍🍳</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500">{isArabic ? 'عدد مجموعات الانطلاق' : 'Departure Groups'}</p>
                        <p className="text-2xl font-black text-emerald-600 mt-1">{regionInfo.groups?.length ?? 0}</p>
                    </div>
                    <div className="text-2xl">🚌</div>
                </div>
            </div>

            {/* Groups Breakdown */}
            <div className="space-y-6">
                {regionInfo.groups.map((group, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        {/* Group Header */}
                        <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 rounded-xl bg-[#FDF0F3] text-[#E91E63] font-mono font-black text-sm border border-[#fbdbe3]">
                                        ⏱️ {format12Hour(group.start_time)}
                                    </span>
                                    <h3 className="text-sm font-bold text-gray-900">
                                        {isArabic ? `مجموعة انطلاق فترة الساعة ${format12Hour(group.start_time)}` : `Shift Batch ${format12Hour(group.start_time)}`}
                                    </h3>
                                </div>
                                <div className="mt-2 text-xs text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <span>🚏 {isArabic ? 'نقطة الانطلاق' : 'Departure Point'}: <strong>{group.departure_point?.name || 'غير محددة'}</strong></span>
                                    <span>🚀 {isArabic ? 'وقت الانطلاق' : 'Departure Time'}: <strong className="font-mono">{format12Hour(group.departure_time) || 'غير محدد'}</strong></span>
                                    <span>👨‍✈️ {isArabic ? 'السائق' : 'Driver'}: <strong>{group.driver?.name || 'غير محدد'} {group.driver?.mobile || group.driver?.phone ? `(${group.driver?.mobile || group.driver?.phone})` : ''}</strong></span>
                                    <span>🚐 {isArabic ? 'المركبة واللوحة' : 'Vehicle & Plate'}: <strong>{group.vehicle_type || group.driver?.vehicle_type || '—'} {group.vehicle_plate || group.driver?.vehicle_plate ? `[${group.vehicle_plate || group.driver?.vehicle_plate}]` : ''}</strong></span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-mono font-bold text-xs bg-gray-50 border-gray-200">
                                        <span>👥</span>
                                        <span>{isArabic ? 'الركاب / السعة' : 'Passengers / Cap'}:</span>
                                        <span className={(group.total_passengers || group.workers_list?.length) > (group.vehicle_capacity || group.driver?.vehicle_capacity || 5) ? 'text-rose-600 font-black' : 'text-emerald-700'}>
                                            {group.total_passengers || group.workers_list?.length || 0} / {group.vehicle_capacity || group.driver?.vehicle_capacity || 5}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                <button
                                    onClick={() => handleExportBatchExcel(group)}
                                    className="px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
                                >
                                    <span>📥</span>
                                    <span>{isArabic ? 'تصدير إكسل' : 'Export Excel'}</span>
                                </button>
                                <button
                                    onClick={() => openDispatchModal(group)}
                                    className="px-3.5 py-2 bg-[#E91E63] text-white hover:bg-[#D81B60] rounded-xl text-xs font-bold transition shadow-2xs"
                                >
                                    {isArabic ? 'تجهيز الانطلاق والسائق' : 'Setup Dispatch & Driver'}
                                </button>
                                <button
                                    onClick={() => generateWhatsAppText(group)}
                                    className="px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
                                >
                                    <span>💬</span>
                                    <span>{isArabic ? 'إرسال للسائق عبر WhatsApp' : 'Send WhatsApp'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Workers List Table */}
                        <div className="p-4 space-y-4">
                            <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                                {isArabic ? 'قائمة العاملات والتوزيع في هذه المجموعة' : 'Assigned Workers & Customer Drop-offs'}
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 font-bold uppercase text-[11px] border-b border-gray-100">
                                            <th className="py-2.5 px-3 ">#</th>
                                            <th className="py-2.5 px-3 ">{isArabic ? 'اسم العاملة' : 'Worker Name'}</th>
                                            <th className="py-2.5 px-3 ">{isArabic ? 'عنوان العاملة' : 'Worker Address'}</th>
                                            <th className="py-2.5 px-3 ">{isArabic ? 'رقم الحجز والعميل' : 'Booking & Customer'}</th>
                                            <th className="py-2.5 px-3 ">{isArabic ? 'عنوان تقديم الخدمة' : 'Service Address'}</th>
                                            <th className="py-2.5 px-3 ">{isArabic ? 'الخدمة وتوقيت الزيارة' : 'Service & Time'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {group.workers_list.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="py-6  text-gray-400 font-bold">
                                                    {isArabic ? 'لم يتم تعيين عاملات محددات لهذه المجموعات بعد.' : 'No workers assigned yet.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            group.workers_list.map((w, wIdx) => (
                                                <tr key={wIdx} className="hover:bg-gray-50/60">
                                                    <td className="py-2.5 px-3 font-mono font-bold text-gray-400">{wIdx + 1}</td>
                                                    <td className="py-2.5 px-3 font-bold text-gray-900">
                                                        <div>{w.name || w.worker_name}</div>
                                                        {(w.phone || w.mobile || w.worker_phone) && (
                                                            <div className="text-[10px] text-gray-400 font-mono font-normal dir-ltr ">{w.phone || w.mobile || w.worker_phone}</div>
                                                        )}
                                                        {w.team_name && (
                                                            <div className="mt-1">
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                                                                    👥 {isArabic ? `فريق: ${w.team_name}` : `Team: ${w.team_name}`}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3  text-gray-600">{w.address || w.worker_address || '—'}</td>
                                                    <td className="py-2.5 px-3 font-mono">
                                                        <div className="flex flex-col items-start text-start">
                                                            {w.booking_id ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => navigate(`/bookings/${w.booking_id}`)}
                                                                    className="text-[#E91E63] font-bold hover:underline outline-none text-start"
                                                                >
                                                                    #{w.booking_number || w.booking_ref}
                                                                </button>
                                                            ) : (
                                                                <span className="font-bold text-[#E91E63] text-start">#{w.booking_number || w.booking_ref}</span>
                                                            )}
                                                            {(w.customer_name || w.customer) && (
                                                                <div className="text-xs text-gray-600 font-bold truncate max-w-[160px] text-start mt-0.5">
                                                                    {w.customer_name || w.customer}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3  text-gray-700">{w.service_address || '—'}</td>
                                                    <td className="py-2.5 px-3  font-medium text-gray-800">
                                                        <div>{isArabic ? (w.service_name_ar || w.service_name) : (w.service_name_en || w.service_name)}</div>
                                                        {(w.visit_time || w.time_slot || w.start_time) && (
                                                            <div className="text-[10px] text-gray-800 font-mono mt-0.5" dir="ltr">
                                                                {format12HourRange(w.visit_time || w.time_slot || `${w.start_time || ''} - ${w.end_time || ''}`)}
                                                            </div>
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
                ))}
            </div>

            {/* Modal: Setup Group Dispatch */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-base font-black text-gray-900">
                                {isArabic ? 'تحديث بيانات تجهيز الانطلاق' : 'Setup Dispatch & Driver'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                        </div>

                        <form onSubmit={handleDispatchSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{isArabic ? 'نقطة الانطلاق *' : 'Departure Point *'}</label>
                                <select
                                    required
                                    value={dispatchForm.departure_point_id}
                                    onChange={(e) => setDispatchForm({ ...dispatchForm, departure_point_id: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] outline-none bg-white"
                                >
                                    <option value="">{isArabic ? 'اختر نقطة الانطلاق...' : 'Select point...'}</option>
                                    {departurePoints.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">{isArabic ? 'وقت الانطلاق *' : 'Departure Time *'}</label>
                                    <select
                                        required
                                        value={dispatchForm.departure_time}
                                        onChange={(e) => setDispatchForm({ ...dispatchForm, departure_time: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-[#E91E63] outline-none bg-white cursor-pointer"
                                    >
                                        <option value="">{isArabic ? 'اختر وقت الانطلاق...' : 'Select time...'}</option>
                                        {[
                                            '05:00 AM', '05:30 AM', '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', 
                                            '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', 
                                            '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', 
                                            '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', 
                                            '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', 
                                            '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM'
                                        ]
                                        .filter((time) => parseTimeToMinutes(time) <= getMaxDepartureTimeMinutes(activeGroup?.start_time))
                                        .map((time) => (
                                            <option key={time} value={time}>{time}</option>
                                        ))}
                                    </select>
                                    <span className="text-[10px] text-gray-500 font-bold mt-1 block">
                                        {isArabic 
                                            ? `* يجب أن يكون وقت الانطلاق قبل ساعة من بدء الشفت (قبل ${formatMinutesTo12Hour(getMaxDepartureTimeMinutes(activeGroup?.start_time))})` 
                                            : `* Must be at least 1 hour before shift start (Before ${formatMinutesTo12Hour(getMaxDepartureTimeMinutes(activeGroup?.start_time))})`}
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">{isArabic ? 'السائق المسؤول *' : 'Driver *'}</label>
                                    <select
                                        required
                                        value={dispatchForm.driver_id}
                                        onChange={(e) => setDispatchForm({ ...dispatchForm, driver_id: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] outline-none bg-white"
                                    >
                                        <option value="">{isArabic ? 'اختر السائق...' : 'Select driver...'}</option>
                                        {drivers.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name} {d.mobile ? `(${d.mobile})` : ''} — 🚐 {d.vehicle_type || (isArabic ? 'حافلة' : 'Van')} {d.vehicle_plate ? `[${d.vehicle_plate}]` : ''} ({isArabic ? `سعة: ${d.vehicle_capacity || 5} ركاب` : `Cap: ${d.vehicle_capacity || 5}`})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">{isArabic ? 'ملاحظات وتوجيهات السائق' : 'Driver Notes'}</label>
                                <textarea
                                    rows="2"
                                    value={dispatchForm.notes}
                                    onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                                    placeholder={isArabic ? 'مثال: التجمع بمدخل السكن قبل 10 دقائق...' : 'e.g. Gather 10 mins early'}
                                    className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-1 focus:ring-[#E91E63] outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200"
                                >
                                    {isArabic ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateDispatchMutation.isLoading}
                                    className="px-5 py-2 bg-[#E91E63] text-white rounded-xl text-xs font-bold hover:bg-[#D81B60] disabled:opacity-50"
                                >
                                    {updateDispatchMutation.isLoading ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ وتأكيد الانطلاق' : 'Save & Confirm')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
