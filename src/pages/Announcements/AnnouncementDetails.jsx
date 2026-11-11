import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios.js';
import { hasPermission } from '../../utils/permissions.js';

export default function AnnouncementDetails() {
    const { id: announcementId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('announcements');
    const isArabic = i18n.language?.startsWith('ar');

    // Fetch announcement details
    const { data: announcement, isLoading, isError } = useQuery({
        queryKey: ['announcementDetails', announcementId],
        queryFn: async () => (await axiosInstance.get(`/admin/announcements/${announcementId}`)).data.data,
        enabled: !!announcementId,
    });

    const isAllAudience = Boolean(announcement?.send_to_all);
    const readers = announcement?.readers || [];

    return (
        <div className="space-y-6 font-main w-full pb-12">
            {/* Top Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
                <div>
                    <button
                        onClick={() => navigate('/announcements')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E91E63] transition-colors mb-1.5 outline-none group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>{isArabic ? 'العودة لقائمة الإعلانات' : 'Back to Announcements'}</span>
                    </button>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'تفاصيل الإعلان الموجه' : 'Announcement Details'}
                    </h2>
                </div>

                {announcement && hasPermission('announcements.edit') && (
                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => navigate(`/announcements/${announcementId}/edit`)}
                            className="px-4 h-10 rounded-xl text-xs font-bold bg-[#E91E63] text-white hover:bg-[#D81B60] transition-colors shadow-2xs flex items-center gap-2 outline-none"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                            <span>{isArabic ? 'تعديل الإعلان' : 'Edit Announcement'}</span>
                        </button>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-20 flex flex-col items-center justify-center text-gray-400">
                    <svg className="animate-spin h-9 w-9 text-[#E91E63] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="font-bold text-sm text-gray-600">{isArabic ? 'جاري تحميل تفاصيل الإعلان...' : 'Loading announcement details...'}</p>
                </div>
            ) : isError || !announcement ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-16 text-center text-rose-600 font-bold">
                    {isArabic ? 'حدث خطأ أثناء تحميل تفاصيل الإعلان.' : 'Error loading announcement details.'}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Announcement Overview Hero Header */}
                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-8 space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border mb-2 ${
                                    isAllAudience
                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                    👥 {isAllAudience ? (isArabic ? 'جميع العملاء' : 'All Customers') : (isArabic ? `عملاء محددون (${readers.length})` : `Specific Customers (${readers.length})`)}
                                </span>
                                <h3 className="text-2xl font-black text-gray-900">{announcement.title_ar || announcement.title}</h3>
                                {announcement.title_en && announcement.title_en !== (announcement.title_ar || announcement.title) && (
                                    <h4 className="text-base font-bold text-gray-500 mt-0.5">{announcement.title_en}</h4>
                                )}
                                {announcement.created_at && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        📅 {isArabic ? 'تاريخ النشر: ' : 'Published At: '}{announcement.created_at.substring(0, 10)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Bilingual Message Body Content Grid */}
                        <div className="pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-2">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200">
                                    <span>🇸🇦</span>
                                    <span className="text-xs font-bold text-gray-700">{isArabic ? 'المحتوى العربي' : 'Arabic Content'}</span>
                                </div>
                                <h5 className="font-bold text-sm text-gray-900">{announcement.title_ar || announcement.title}</h5>
                                <p className="text-sm font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">
                                    {announcement.body_ar || announcement.body}
                                </p>
                            </div>

                            <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-2" dir="ltr">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200">
                                    <span>🇬🇧</span>
                                    <span className="text-xs font-bold text-gray-700">English Content</span>
                                </div>
                                <h5 className="font-bold text-sm text-gray-900">{announcement.title_en || announcement.title}</h5>
                                <p className="text-sm font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">
                                    {announcement.body_en || announcement.body}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Target Audience / Reader List */}
                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-8 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                </svg>
                                <span>{isArabic ? 'قائمة العملاء المستهدفين' : 'Targeted Customers Audience'}</span>
                            </h4>
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                {isAllAudience ? (isArabic ? 'العملاء الإجماليين' : 'All Total Customers') : `${readers.length} ${isArabic ? 'عملاء' : 'Customers'}`}
                            </span>
                        </div>

                        {isAllAudience ? (
                            <div className="p-8 text-center bg-emerald-50/50 border border-emerald-100 rounded-2xl text-emerald-800 font-bold text-xs">
                                ✓ {isArabic ? 'تم توجيه هذا الإعلان لجميع حسابات العملاء المودعين في النظام.' : 'This announcement is sent to all registered customer accounts.'}
                            </div>
                        ) : readers.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 font-bold text-xs">
                                {isArabic ? 'لا يوجد عملاء محددون مستهدفون.' : 'No targeted customers listed.'}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">
                                            <th className="py-3.5 px-4 text-center">{isArabic ? 'اسم العميل' : 'Customer Name'}</th>
                                            <th className="py-3.5 px-4 text-center">{isArabic ? 'البريد الإلكتروني' : 'Email'}</th>
                                            <th className="py-3.5 px-4 text-center">{isArabic ? 'رقم الهاتف' : 'Phone Number'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-xs">
                                        {readers.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="py-3 px-4 text-start font-bold text-gray-900">
                                                    {user.name || `${user.first_name || ''} ${user.last_name || ''}`}
                                                </td>
                                                <td className="py-3 px-4 text-start text-gray-600 font-mono">
                                                    {user.email || '—'}
                                                </td>
                                                <td className="py-3 px-4 text-start text-gray-600 font-mono" dir="ltr">
                                                    {user.phone_number || user.phone || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
