import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios.js';
import { hasPermission } from '../../utils/permissions.js';

const InfoItem = ({ label, value, highlight = false, badge = false, badgeBg = 'bg-gray-100 text-gray-700' }) => (
    <div className="flex items-start justify-between gap-3 p-3.5 bg-gray-50/60 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-colors">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        {badge ? (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${badgeBg}`}>
                {value}
            </span>
        ) : (
            <span className={`text-xs ${highlight ? 'font-black text-[#E91E63]' : 'font-bold text-gray-800'} text-end truncate max-w-[200px]`}>
                {value ?? '—'}
            </span>
        )}
    </div>
);

export default function MobileNotificationDetails() {
    const { id: notificationId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('notifications');
    const isArabic = i18n.language?.startsWith('ar');

    // Fetch details query
    const { data: notification, isLoading, isError } = useQuery({
        queryKey: ['mobileNotificationDetail', notificationId],
        queryFn: async () => (await axiosInstance.get(`/admin/mobile-notifications/${notificationId}`)).data.data,
        enabled: !!notificationId,
    });

    return (
        <div className="space-y-6 font-main max-w-7xl mx-auto pb-12">
            {/* Top Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
                <div>
                    <button
                        onClick={() => navigate('/mobile-notifications')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E91E63] transition-colors mb-1.5 outline-none group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>{isArabic ? 'العودة لقائمة الإشعارات' : 'Back to Notifications'}</span>
                    </button>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'تفاصيل الإشعار المجدول' : 'Scheduled Push Notification Details'}
                    </h2>
                </div>

                {notification && hasPermission('notifications.edit') && (
                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => navigate(`/mobile-notifications/${notificationId}/edit`)}
                            className="px-4 h-10 rounded-xl text-xs font-bold bg-[#E91E63] text-white hover:bg-[#D81B60] transition-colors shadow-2xs flex items-center gap-2 outline-none"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                            <span>{isArabic ? 'تعديل الإشعار' : 'Edit Notification'}</span>
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
                    <p className="font-bold text-sm text-gray-600">{isArabic ? 'جاري تحميل تفاصيل الإشعار...' : 'Loading notification details...'}</p>
                </div>
            ) : isError || !notification ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-16 text-center text-rose-600 font-bold">
                    {isArabic ? 'حدث خطأ أثناء تحميل تفاصيل الإشعار.' : 'Error loading notification details.'}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Hero Header Card */}
                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-8 space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className="px-3 py-1 bg-pink-50 text-[#E91E63] border border-pink-100 rounded-full text-xs font-bold">
                                        📱 {isArabic ? 'إشعار موبايل (Push Notification)' : 'Mobile Push Notification'}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                        notification.status === 'sent'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                        {notification.status === 'sent' ? (isArabic ? 'تم الإرسال' : 'Sent') : (isArabic ? 'مجدول' : 'Scheduled')}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black text-gray-900">{notification.title}</h3>
                            </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                            <InfoItem
                                label={isArabic ? 'الجمهور المستهدف' : 'Target Audience'}
                                value={
                                    notification.audience === 'all'
                                        ? (isArabic ? 'كل المستخدمين' : 'All Users')
                                        : notification.audience === 'active_customers'
                                        ? (isArabic ? 'العملاء النشطين' : 'Active Customers')
                                        : (isArabic ? 'العملاء غير النشطين' : 'Inactive Customers')
                                }
                                badge
                                badgeBg="bg-blue-50 text-blue-700 border-blue-200"
                            />
                            <InfoItem label={isArabic ? 'تاريخ الإرسال' : 'Send Date'} value={notification.send_date} />
                            <InfoItem label={isArabic ? 'وقت الإرسال' : 'Send Time'} value={notification.send_time} />
                        </div>
                    </div>

                    {/* Bilingual Content Preview Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Arabic Content Box */}
                        <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 space-y-4">
                            <h4 className="text-sm font-extrabold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#E91E63]" />
                                <span>{isArabic ? 'المحتوى باللغة العربية' : 'Arabic Notification Content'}</span>
                            </h4>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase">{isArabic ? 'عنوان الإشعار (عربي)' : 'Title (Arabic)'}</label>
                                    <p className="font-extrabold text-gray-900 text-base mt-1">{notification.title_ar || '—'}</p>
                                </div>

                                <div className="pt-3 border-t border-gray-100">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase">{isArabic ? 'نص الإشعار (عربي)' : 'Content (Arabic)'}</label>
                                    <div className="p-4 mt-1 rounded-2xl bg-gray-50/70 border border-gray-100 text-sm font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">
                                        {notification.content_ar || '—'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* English Content Box */}
                        <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 space-y-4">
                            <h4 className="text-sm font-extrabold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-600" />
                                <span>{isArabic ? 'المحتوى باللغة الإنجليزية' : 'English Notification Content'}</span>
                            </h4>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase">{isArabic ? 'عنوان الإشعار (إنجليزي)' : 'Title (English)'}</label>
                                    <p className="font-extrabold text-gray-900 text-base mt-1">{notification.title_en || '—'}</p>
                                </div>

                                <div className="pt-3 border-t border-gray-100">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase">{isArabic ? 'نص الإشعار (إنجليزي)' : 'Content (English)'}</label>
                                    <div className="p-4 mt-1 rounded-2xl bg-gray-50/70 border border-gray-100 text-sm font-medium text-gray-800 leading-relaxed whitespace-pre-wrap" dir="ltr">
                                        {notification.content_en || '—'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
