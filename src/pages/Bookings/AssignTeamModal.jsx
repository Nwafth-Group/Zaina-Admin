import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

export default function AssignTeamModal({ booking, isArabic, onClose, onSuccess }) {
    const queryClient = useQueryClient();
    const currentTeamId = booking?.team?.id || booking?.team_id || null;
    const isReassign = Boolean(currentTeamId);

    const [selectedTeamId, setSelectedTeamId] = useState(currentTeamId);
    const [note, setNote] = useState('');
    const [overrideConflict, setOverrideConflict] = useState(false);

    // Fetch eligible teams with slot availability status
    const { data: eligibleTeams = [], isLoading } = useQuery({
        queryKey: ['eligibleTeams', booking.id],
        queryFn: async () => {
            const res = await axiosInstance.get(`/admin/bookings/${booking.id}/eligible-teams`);
            return res.data?.data || [];
        },
        enabled: !!booking.id,
    });

    const selectedTeam = eligibleTeams.find((t) => t.id === Number(selectedTeamId));
    const hasConflict = selectedTeam && !selectedTeam.is_available;

    const assignMutation = useMutation({
        mutationFn: (payload) => axiosInstance.post(`/admin/bookings/${booking.id}/assign-team`, payload),
        onSuccess: (res) => {
            toast.success(res.data?.message || (isArabic ? 'تم تعيين فريق العمل بنجاح' : 'Team assigned successfully'));
            queryClient.invalidateQueries({ queryKey: ['bookingDetail'] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', String(booking.id)] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', Number(booking.id)] });
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['dailyOperations'] });
            queryClient.invalidateQueries({ queryKey: ['transportDispatch'] });
            onSuccess?.();
            onClose();
        },
        onError: (err) => {
            const msg = err.response?.data?.message || '';
            toast.error(msg || (isArabic ? 'حدث خطأ أثناء تعيين الفريق.' : 'Failed to assign team.'));
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedTeamId) {
            toast.error(isArabic ? 'الرجاء اختيار فريق عمل أولاً.' : 'Please select a team first.');
            return;
        }

        if (hasConflict && !overrideConflict) {
            toast.error(isArabic ? 'يرجى تأكيد تجاوز تعارض المواعيد لتتمكن من المتابعة.' : 'Please confirm conflict override to proceed.');
            return;
        }

        assignMutation.mutate({
            team_id: Number(selectedTeamId),
            note: note.trim() || null,
            override_conflict: overrideConflict,
        });
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
                onClick={onClose}
            />

            {/* Modal Dialog */}
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 md:p-7 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-gray-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                </svg>
                            </span>
                            <h3 className="text-lg font-black text-gray-900">
                                {isReassign
                                    ? (isArabic ? 'إعادة تعيين فريق العمل' : 'Reassign Operational Team')
                                    : (isArabic ? 'تعيين فريق عمل للطلب' : 'Assign Operational Team')}
                            </h3>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                            {isArabic
                                ? 'اختر الفريق المناسب للطلب مع التأكد من جاهزية العمالة وتطابق المواعيد.'
                                : 'Select an eligible team for this booking and review slot availability.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors outline-none"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Booking Context Pill */}
                <div className="mt-4 p-3 rounded-2xl bg-gray-50/80 border border-gray-100 flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-700">{booking.booking_ref}</span>
                        <span className="text-gray-300">•</span>
                        <span className="font-medium text-gray-600">{booking.booking_date}</span>
                        <span className="text-gray-300">•</span>
                        <span className="font-medium text-gray-600">{booking.time_slot}</span>
                    </div>
                    {isReassign && booking.team && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-lg">
                            <span>{isArabic ? 'الفريق الحالي:' : 'Current:'}</span>
                            <span>{booking.team.name || booking.team.code}</span>
                        </div>
                    )}
                </div>

                {/* Team Selection List */}
                <div className="mt-4">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                        {isArabic ? 'الفرق التشغيلية المؤهلة للخدمة' : 'Eligible Operational Teams'}
                    </label>

                    {isLoading ? (
                        <div className="p-8 flex flex-col items-center justify-center text-gray-400">
                            <svg className="animate-spin h-7 w-7 text-indigo-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-xs font-bold">{isArabic ? 'جاري فحص الفرق المتاحة...' : 'Checking team availability...'}</span>
                        </div>
                    ) : eligibleTeams.length === 0 ? (
                        <div className="p-6 text-center rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-800 text-xs font-bold">
                            {isArabic
                                ? 'لا توجد فرق عمل نشطة مرتبطة بهذه الخدمة حالياً.'
                                : 'No active teams are currently linked to this service.'}
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                            {eligibleTeams.map((team) => {
                                const isSelected = Number(selectedTeamId) === Number(team.id);
                                const isCurrent = team.is_currently_assigned;
                                const isAvailable = team.is_available;

                                return (
                                    <div
                                        key={team.id}
                                        onClick={() => setSelectedTeamId(team.id)}
                                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                            isSelected
                                                ? 'bg-indigo-50/60 border-indigo-500 shadow-2xs ring-2 ring-indigo-500/20'
                                                : 'bg-white hover:bg-gray-50/70 border-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {/* Radio circle indicator */}
                                            <div
                                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                                    isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-white'
                                                }`}
                                            >
                                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-black text-gray-900">
                                                        {isArabic ? (team.name_ar || team.name_en || team.code) : (team.name_en || team.name_ar || team.code)}
                                                    </span>
                                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                                        {team.code}
                                                    </span>
                                                    {isCurrent && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                                                            {isArabic ? 'الفريق الحالي' : 'Current'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Member summary */}
                                                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                                                    <span>
                                                        {team.workers_count} {isArabic ? 'عمال' : 'workers'}
                                                    </span>
                                                    {team.workers && team.workers.length > 0 && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="truncate max-w-[200px]">
                                                                {team.workers.map((w) => w.name).join(', ')}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Availability Status Badge */}
                                        <div className="shrink-0 text-end">
                                            {isAvailable ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    {isArabic ? 'متاح بالكامل' : 'Available'}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                    {isArabic ? 'تعارض في الموعد' : 'Conflict'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Conflict Override Warning */}
                {hasConflict && (
                    <div className="mt-3.5 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-800 text-xs">
                        <div className="flex items-start gap-2.5">
                            <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                            <div className="flex-1">
                                <p className="font-bold">
                                    {isArabic
                                        ? 'تحذير تعارض في المواعيد'
                                        : 'Schedule Conflict Warning'}
                                </p>
                                <p className="text-[11px] text-amber-700 mt-0.5">
                                    {isArabic
                                        ? 'الفريق المحدد لديه حجز آخر أو فاصل انتقالي غير كافٍ في هذا الوقت.'
                                        : 'The selected team is busy or has insufficient buffer around this slot.'}
                                </p>
                                <label className="flex items-center gap-2 mt-2 cursor-pointer font-bold text-amber-900 select-none">
                                    <input
                                        type="checkbox"
                                        checked={overrideConflict}
                                        onChange={(e) => setOverrideConflict(e.target.checked)}
                                        className="w-4 h-4 rounded text-amber-600 border-amber-300 focus:ring-amber-500"
                                    />
                                    <span>{isArabic ? 'تجاوز التعارض وتعيين الفريق إجبارياً' : 'Override conflict and force assignment'}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin Note Textarea */}
                <div className="mt-4">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        {isArabic ? 'ملاحظة الإدارة (اختياري)' : 'Admin Note (Optional)'}
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows="2"
                        placeholder={isArabic ? 'مثال: تعيين يدوي للفريق حسب طلب العميل أو الطوارئ...' : 'e.g. Manual assignment per operational need...'}
                        className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-xl outline-none text-xs transition-colors resize-none font-medium"
                    />
                </div>

                {/* Actions Footer */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
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
                        disabled={assignMutation.isPending || !selectedTeamId || (hasConflict && !overrideConflict)}
                        className="px-5 py-2 text-xs rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {assignMutation.isPending && (
                            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        <span>
                            {assignMutation.isPending
                                ? (isArabic ? 'جاري الحفظ...' : 'Saving...')
                                : isReassign
                                ? (isArabic ? 'تأكيد إعادة التعيين' : 'Confirm Reassignment')
                                : (isArabic ? 'تأكيد تعيين الفريق' : 'Confirm Assignment')}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
