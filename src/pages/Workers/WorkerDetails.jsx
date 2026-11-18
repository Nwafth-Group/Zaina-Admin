import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { hasPermission } from '../../utils/permissions.js';

const STATUS_STYLES = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    suspended: 'bg-rose-50 text-rose-700 border-rose-200/80',
    inactive: 'bg-gray-100 text-gray-600 border-gray-200/80',
};

const STATUS_DOTS = {
    active: 'bg-emerald-500',
    suspended: 'bg-rose-500',
    inactive: 'bg-gray-400',
};

const BOOKING_STATUS_STYLES = {
    Upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
    inService: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

const StarRow = ({ value = 0 }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
            <svg key={i} className={`w-4 h-4 ${i <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        ))}
    </div>
);

const StatCard = ({ icon, label, value, accent = 'text-gray-900', bg = 'bg-gray-50' }) => (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs hover:shadow-xs transition-shadow">
        {icon && (
            <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0 border border-gray-100`}>
                {icon}
            </div>
        )}
        <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
            <p className={`text-xl font-black ${accent} mt-0.5`}>{value}</p>
        </div>
    </div>
);

const InfoItem = ({ icon, label, value, highlight = false, isPhone = false }) => (
    <div className="flex items-start gap-3 p-3.5 bg-gray-50/60 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-colors">
        {icon && (
            <div className="w-8 h-8 rounded-xl bg-white border border-gray-200/60 flex items-center justify-center text-gray-500 shrink-0 shadow-2xs">
                {icon}
            </div>
        )}
        <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
            {isPhone && value ? (
                <a href={`tel:${value}`} className="text-sm font-extrabold text-[#E91E63] hover:underline truncate block text-start outline-none" dir="ltr">
                    {value}
                </a>
            ) : (
                <p className={`text-sm ${highlight ? 'font-extrabold text-gray-900' : 'font-bold text-gray-700'} truncate`}>
                    {value ?? '—'}
                </p>
            )}
        </div>
    </div>
);

const reviewerName = (r) => [r.customer?.first_name, r.customer?.last_name].filter(Boolean).join(' ') || r.customer?.name || '—';

export default function WorkerDetails() {
    const { id: workerId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('workers');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('profile'); // profile | bookings | reviews

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['worker-details', workerId],
        queryFn: async () => (await axiosInstance.get(`/admin/workers/${workerId}/details`)).data.data,
        enabled: !!workerId,
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async () => axiosInstance.post(`/admin/workers/${workerId}/toggle-status`),
        onSuccess: (res) => {
            toast.success(res.data?.message || (isArabic ? 'تم تحديث حالة العامل بنجاح' : 'Worker status updated successfully'));
            queryClient.invalidateQueries({ queryKey: ['worker-details'] });
            queryClient.invalidateQueries({ queryKey: ['worker-details', workerId] });
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            refetch();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'فشل تحديث حالة العامل' : 'Failed to update worker status'), { duration: 6000 });
        },
    });

    const worker = data?.worker;
    const stats = data?.stats || { total_bookings: 0, completed_bookings: 0, reviews_count: 0 };
    const bookings = data?.latest_bookings || [];
    const reviews = data?.reviews || [];

    const serviceLabel = (service) =>
        isArabic ? (service.name_ar || service.name_en) : (service.name_en || service.name_ar);

    const sideMenuItem = (key, label, iconPath, count = null) => {
        const active = activeTab === key;
        return (
            <button
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all text-start w-full whitespace-nowrap outline-none ${
                    active ? 'bg-[#FDF0F3] text-[#E91E63] shadow-2xs' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
            >
                <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                    </svg>
                    <span>{label}</span>
                </div>
                {count !== null && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${active ? 'bg-[#E91E63] text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {count}
                    </span>
                )}
            </button>
        );
    };

    return (
        <div className="space-y-6 font-main max-w-7xl mx-auto pb-12">
            {/* Top Navigation & Breadcrumbs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
                <div>
                    <button
                        onClick={() => navigate('/workers')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E91E63] transition-colors mb-1.5 outline-none group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>{isArabic ? 'العودة لقائمة العاملين' : 'Back to Workers'}</span>
                    </button>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'ملف العامل' : 'Worker Profile'}
                    </h2>
                </div>

                {worker && hasPermission('workers.edit') && (
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => toggleStatusMutation.mutate()}
                            disabled={toggleStatusMutation.isPending || (worker.status === 'active' && worker.has_active_bookings)}
                            title={(worker.status === 'active' && worker.has_active_bookings) ? (isArabic ? 'لا يمكن تغيير حالة العامل لوجود خدمات قادمة أو قيد التنفيذ مسندة إليه' : 'Cannot change status with upcoming or in-progress services') : ''}
                            className={`px-4 h-10 rounded-xl text-xs font-bold border active:scale-95 transition-all flex items-center gap-2 outline-none ${
                                worker.status === 'active' && worker.has_active_bookings
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                    : worker.status === 'active'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                        >
                            <span>
                                {worker.status === 'active'
                                    ? (isArabic ? 'إيقاف حساب العامل' : 'Suspend Worker')
                                    : (isArabic ? 'تفعيل حساب العامل' : 'Activate Worker')}
                            </span>
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
                    <p className="font-bold text-sm text-gray-600">{isArabic ? 'جاري تحميل تفاصيل العامل...' : 'Loading worker details...'}</p>
                </div>
            ) : isError || !data ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-16 text-center text-rose-600 font-bold">
                    {isArabic ? 'حدث خطأ أثناء تحميل تفاصيل العامل.' : 'Error loading worker details.'}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Top Hero Banner Card */}
                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                            <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-start">
                                <div className="w-20 h-20 rounded-full bg-[#FDF0F3] border-2 border-pink-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                    {worker.image ? (
                                        <img src={worker.image} alt={worker.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[#E91E63] font-black text-3xl">{worker.name?.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                                        <h3 className="text-2xl font-black text-gray-900">{worker.name}</h3>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${STATUS_STYLES[worker.status] || STATUS_STYLES.inactive}`}>
                                            <span className={`w-2 h-2 rounded-full ${STATUS_DOTS[worker.status] || 'bg-gray-400'}`} />
                                            {worker.status === 'suspended' ? (isArabic ? 'موقوف' : 'Suspended') : t(`status.${worker.status}`)}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-500 flex items-center justify-center md:justify-start gap-2">
                                        <span>{worker.nationality || '—'}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <StarRow value={worker.rating} />
                                            <span className="font-extrabold text-amber-600">{Number(worker.rating || 0).toFixed(2)}</span>
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Assigned Primary Service Badge */}
                            {worker.assigned_service && (
                                <div className="bg-pink-50/50 border border-pink-100 rounded-2xl p-4 md:px-6 text-start md:text-end shrink-0 min-w-[180px]">
                                    <p className="text-[11px] font-bold text-[#E91E63] uppercase tracking-wider">{isArabic ? 'الخدمة المعينة' : 'Assigned Service'}</p>
                                    <p className="text-base font-extrabold text-gray-900 mt-0.5">
                                        {serviceLabel(worker.assigned_service)}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-gray-100">
                            <StatCard
                                label={t('details.stats.total_bookings')}
                                value={stats.total_bookings || 0}
                                bg="bg-blue-50 text-blue-600"
                                icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                            />
                            <StatCard
                                label={t('details.stats.completed')}
                                value={stats.completed_bookings || 0}
                                accent="text-emerald-600"
                                bg="bg-emerald-50 text-emerald-600"
                                icon={<svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            />
                            <StatCard
                                label={t('details.stats.reviews')}
                                value={stats.reviews_count || 0}
                                accent="text-[#E91E63]"
                                bg="bg-pink-50 text-[#E91E63]"
                                icon={<svg className="w-5 h-5 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
                            />
                        </div>
                    </div>

                    {/* Main Layout Grid */}
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        {/* Side Navigation Tabs */}
                        <div className="w-full lg:w-64 bg-white border border-gray-100 rounded-3xl p-3 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto shadow-2xs">
                            {sideMenuItem('profile', t('details.tabs.profile'), 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z')}
                            {sideMenuItem('bookings', t('details.tabs.bookings'), 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', bookings.length)}
                            {sideMenuItem('reviews', t('details.tabs.reviews'), 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', reviews.length)}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 w-full min-w-0 space-y-6">
                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    {/* 1. Basic Info Card */}
                                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                        <h4 className="text-sm font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                                            </svg>
                                            <span>{t('details.info_title')}</span>
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            <InfoItem label={isArabic ? 'الجنسية' : 'Nationality'} value={worker.nationality} highlight />
                                            <InfoItem label={isArabic ? 'الجنس' : 'Gender'} value={worker.gender} />
                                            <InfoItem label={isArabic ? 'رقم الهاتف' : 'Phone Number'} value={worker.phone_number} isPhone />
                                            <InfoItem label={isArabic ? 'رقم الهوية' : 'ID Number'} value={worker.id_number} />
                                            <InfoItem label={isArabic ? 'الحالة' : 'Status'} value={worker.status === 'suspended' ? (isArabic ? 'موقوف' : 'Suspended') : t(`status.${worker.status}`)} />
                                            <InfoItem label={isArabic ? 'الخدمة المعينة' : 'Assigned Service'} value={worker.assigned_service ? serviceLabel(worker.assigned_service) : (isArabic ? 'غير معين' : 'Unassigned')} highlight />
                                        </div>

                                        {worker.address && (
                                            <div className="mt-5 pt-4 border-t border-gray-100">
                                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{isArabic ? 'العنوان' : 'Address'}</p>
                                                <p className="text-xs font-medium text-gray-700 leading-relaxed bg-gray-50/60 p-4 rounded-2xl border border-gray-100">{worker.address}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Supported Services Card */}
                                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                        <h4 className="text-sm font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-1.964.987-1.964 2.063v.798c0 .878-.713 1.59-1.59 1.59H12a1.5 1.5 0 01-1.5-1.5v-1.066c0-.987-.803-1.79-1.79-1.79H7.644c-.792 0-1.442-.64-1.442-1.442V8.375" />
                                            </svg>
                                            <span>{t('details.services_title')}</span>
                                        </h4>

                                        {worker.services?.length ? (
                                            <div className="flex flex-wrap gap-2.5">
                                                {worker.services.map((s) => (
                                                    <span key={s.id} className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#FDF0F3] text-[#E91E63] border border-pink-100 shadow-2xs">
                                                        {serviceLabel(s)}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 py-2">{t('details.services_empty')}</p>
                                        )}
                                    </div>

                                    {/* 3. Weekly Work Schedule & Vacation Days Card */}
                                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-5 flex-wrap gap-2">
                                            <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>{isArabic ? 'جدول أيام العمل والإجازات الأسبوعية' : 'Weekly Work Schedule & Vacation Days'}</span>
                                            </h4>
                                            <div className="flex items-center gap-3 text-xs">
                                                <span className="flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    <span>{isArabic ? `${worker.work_days?.length ?? 7} أيام عمل` : `${worker.work_days?.length ?? 7} Work Days`}</span>
                                                </span>
                                                <span className="flex items-center gap-1.5 font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                                    <span>{isArabic ? `${7 - (worker.work_days?.length ?? 7)} أيام إجازة` : `${7 - (worker.work_days?.length ?? 7)} Days Off`}</span>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                                            {[
                                                { key: 'saturday', labelAr: 'السبت', labelEn: 'Sat' },
                                                { key: 'sunday', labelAr: 'الأحد', labelEn: 'Sun' },
                                                { key: 'monday', labelAr: 'الاثنين', labelEn: 'Mon' },
                                                { key: 'tuesday', labelAr: 'الثلاثاء', labelEn: 'Tue' },
                                                { key: 'wednesday', labelAr: 'الأربعاء', labelEn: 'Wed' },
                                                { key: 'thursday', labelAr: 'الخميس', labelEn: 'Thu' },
                                                { key: 'friday', labelAr: 'الجمعة', labelEn: 'Fri' },
                                            ].map((day) => {
                                                const effectiveWorkDays = Array.isArray(worker.work_days) && worker.work_days.length > 0
                                                    ? worker.work_days.map(d => String(d).toLowerCase())
                                                    : ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
                                                const isWorking = effectiveWorkDays.includes(day.key);

                                                return (
                                                    <div
                                                        key={day.key}
                                                        className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between gap-2 ${
                                                            isWorking
                                                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 shadow-2xs'
                                                                : 'bg-rose-50/60 border-rose-200 text-rose-800'
                                                        }`}
                                                    >
                                                        <span className="text-xs font-black">
                                                            {isArabic ? day.labelAr : day.labelEn}
                                                        </span>
                                                        <span
                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                                isWorking
                                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                                    : 'bg-rose-100 text-rose-700 border-rose-300'
                                                            }`}
                                                        >
                                                            {isWorking ? (isArabic ? '✓ يعمل' : 'Working') : (isArabic ? '🏖️ إجازة' : 'Day Off')}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Bookings */}
                            {activeTab === 'bookings' && (
                                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-start text-xs border-collapse">
                                            <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold border-b border-gray-100 text-[11px]">
                                                <tr>
                                                    <th className="p-4 text-start">{t('details.col.ref')}</th>
                                                    <th className="p-4 text-start">{t('details.col.customer')}</th>
                                                    <th className="p-4 text-start">{t('details.col.service')}</th>
                                                    <th className="p-4 text-start">{t('details.col.date')}</th>
                                                    <th className="p-4 text-center">{t('details.col.status')}</th>
                                                    <th className="p-4 text-end">{t('details.col.amount')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {bookings.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="p-12 text-center text-gray-400 text-xs bg-white font-medium">
                                                            {t('details.bookings_empty')}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    bookings.map((b) => (
                                                        <tr key={b.id} className="hover:bg-gray-50/60 transition-colors bg-white">
                                                            <td className="p-4 font-mono font-bold">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => navigate(`/bookings/${b.id}`)}
                                                                    className="text-[#E91E63] font-bold hover:underline outline-none"
                                                                >
                                                                    #{b.booking_ref}
                                                                </button>
                                                            </td>
                                                            <td className="p-4 font-bold text-gray-900">{b.customer_name || '—'}</td>
                                                            <td className="p-4 text-gray-700 font-medium">{b.service_name || '—'}</td>
                                                            <td className="p-4 whitespace-nowrap text-gray-500 font-medium">{b.booking_date || '—'}</td>
                                                            <td className="p-4 text-center">
                                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${BOOKING_STATUS_STYLES[b.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                                    {t(`details.booking_status.${b.status}`, b.status)}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-end font-extrabold text-gray-900 whitespace-nowrap">{b.total_amount} {b.currency}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Reviews */}
                            {activeTab === 'reviews' && (
                                <div className="space-y-3">
                                    {reviews.length === 0 ? (
                                        <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-12 text-center text-gray-400 text-xs font-medium">
                                            {t('details.reviews_empty')}
                                        </div>
                                    ) : (
                                        reviews.map((r) => (
                                            <div key={r.id} className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-5 space-y-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-full bg-[#FDF0F3] text-[#E91E63] flex items-center justify-center font-bold shrink-0 text-sm">
                                                            {r.customer?.first_name?.charAt(0) || '?'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-extrabold text-gray-900 truncate">{reviewerName(r)}</p>
                                                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                                                                {r.created_since}
                                                                {r.booking_ref && (
                                                                    <>
                                                                        {' · '}
                                                                        {r.booking_id ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => navigate(`/bookings/${r.booking_id}`)}
                                                                                className="text-[#E91E63] font-bold hover:underline"
                                                                            >
                                                                                #{r.booking_ref}
                                                                            </button>
                                                                        ) : (
                                                                            `#${r.booking_ref}`
                                                                        )}
                                                                    </>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <StarRow value={r.rating} />
                                                </div>
                                                {r.comment && (
                                                    <p className="text-xs font-medium text-gray-700 leading-relaxed bg-gray-50/60 p-3.5 rounded-2xl border border-gray-100 italic">
                                                        "{r.comment}"
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
