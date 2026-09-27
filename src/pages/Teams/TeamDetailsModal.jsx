import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

export default function TeamDetailsModal({ teamId, isOpen, onClose }) {
    const { i18n } = useTranslation();
    const isArabic = i18n.language?.startsWith('ar');

    const { data: team, isLoading } = useQuery({
        queryKey: ['team-details', teamId],
        queryFn: async () => {
            const res = await axiosInstance.get(`/admin/teams/${teamId}`);
            return res.data?.data;
        },
        enabled: isOpen && !!teamId,
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-5 end-5 text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#E91E63]/20 border border-[#E91E63]/40 flex items-center justify-center text-2xl">
                            👥
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black">
                                    {isArabic ? team?.name_ar : team?.name_en || team?.name_ar}
                                </h2>
                                {team && (
                                    <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-[#E91E63] text-white rounded-full">
                                        {team.code}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-300 mt-1">
                                {isArabic ? team?.name_en : team?.name_ar}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#E91E63] border-t-transparent"></div>
                        </div>
                    ) : team ? (
                        <>
                            {/* Overview Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl">
                                    <span className="text-xs text-gray-400 block font-medium">
                                        {isArabic ? 'الحالة التشغيلية' : 'Status'}
                                    </span>
                                    <span
                                        className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                            team.status === 'active'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                        }`}
                                    >
                                        {team.status === 'active'
                                            ? isArabic ? 'نشط' : 'Active'
                                            : isArabic ? 'معطل' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl">
                                    <span className="text-xs text-gray-400 block font-medium">
                                        {isArabic ? 'عدد الأعضاء' : 'Workers Count'}
                                    </span>
                                    <span className="text-lg font-black text-gray-800 mt-0.5 block">
                                        {team.workers_count || 0} {isArabic ? 'عمال' : 'Workers'}
                                    </span>
                                </div>
                                <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl">
                                    <span className="text-xs text-gray-400 block font-medium">
                                        {isArabic ? 'الخدمات المسندة' : 'Services'}
                                    </span>
                                    <span className="text-lg font-black text-gray-800 mt-0.5 block">
                                        {team.services?.length || 0} {isArabic ? 'خدمات' : 'Services'}
                                    </span>
                                </div>
                                <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl">
                                    <span className="text-xs text-gray-400 block font-medium">
                                        {isArabic ? 'تاريخ الإنشاء' : 'Created At'}
                                    </span>
                                    <span className="text-xs font-bold text-gray-700 mt-1 block">
                                        {team.created_at?.split(' ')[0] || '—'}
                                    </span>
                                </div>
                            </div>

                            {/* Notes */}
                            {team.notes && (
                                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl">
                                    <h4 className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                                        <span>📝</span> {isArabic ? 'ملاحظات الفريق' : 'Team Notes'}
                                    </h4>
                                    <p className="text-xs text-amber-900 leading-relaxed">{team.notes}</p>
                                </div>
                            )}

                            {/* Members Section */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <span>👷‍♂️</span> {isArabic ? 'أعضاء الفريق (العمال)' : 'Team Members'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {team.workers?.length || 0} {isArabic ? 'عامل مسند' : 'assigned workers'}
                                    </span>
                                </h3>

                                {team.workers?.length === 0 ? (
                                    <div className="p-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400">
                                        {isArabic ? 'لا يوجد عمال مسندين لهذا الفريق حالياً.' : 'No workers assigned yet.'}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {team.workers.map((worker) => (
                                            <div
                                                key={worker.id}
                                                className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-xs hover:border-[#E91E63]/30 transition-all"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-[#E91E63]/10 text-[#E91E63] font-bold flex items-center justify-center overflow-hidden border border-[#E91E63]/20 shrink-0">
                                                    {worker.image ? (
                                                        <img src={worker.image} alt={worker.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        worker.name?.charAt(0) || 'W'
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-gray-800 truncate">{worker.name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                                        <span>{worker.nationality || '—'}</span>
                                                        <span>•</span>
                                                        <span dir="ltr">{worker.phone_number}</span>
                                                    </div>
                                                </div>
                                                <span
                                                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                                                        worker.status === 'active'
                                                            ? 'bg-emerald-50 text-emerald-600'
                                                            : 'bg-rose-50 text-rose-600'
                                                    }`}
                                                >
                                                    {worker.status === 'active' ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Services Section */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <span>🛠️</span> {isArabic ? 'الخدمات التخصصية المسندة' : 'Assigned Services'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {team.services?.length || 0} {isArabic ? 'خدمات' : 'services'}
                                    </span>
                                </h3>

                                {team.services?.length === 0 ? (
                                    <div className="p-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400">
                                        {isArabic ? 'لم يتم إسناد هذا الفريق لأي خدمة تخصصية بعد.' : 'No services assigned to this team yet.'}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {team.services.map((srv) => (
                                            <div
                                                key={srv.id}
                                                className="px-3 py-2 bg-pink-50/50 border border-pink-100 rounded-xl flex items-center gap-2"
                                            >
                                                <span className="text-xs font-bold text-gray-800">
                                                    {isArabic ? srv.name_ar : srv.name_en || srv.name_ar}
                                                </span>
                                                {srv.service_code && (
                                                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-white border border-pink-200 rounded text-[#E91E63]">
                                                        {srv.service_code}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        {isArabic ? 'إغلاق' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
}
