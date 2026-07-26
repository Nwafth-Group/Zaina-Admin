import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { hasPermission } from '../../utils/permissions.js';

const STATUS_STYLES = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    pending: 'bg-amber-50 text-amber-700 border-amber-200/80',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200/80',
    unverified: 'bg-gray-100 text-gray-600 border-gray-200/80',
};

const STATUS_DOTS = {
    approved: 'bg-emerald-500',
    pending: 'bg-amber-500 animate-pulse',
    rejected: 'bg-rose-500',
    unverified: 'bg-gray-400',
};

function DocumentTile({ label, url, t }) {
    return (
        <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">{label}</span>
            {url ? (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t('review_modal.view_full')}
                    className="group relative block rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 aspect-[4/3] shadow-2xs hover:shadow-md transition-all"
                >
                    <img src={url} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity text-xs backdrop-blur-2xs">
                        🔍 {t('review_modal.view_full')}
                    </span>
                </a>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 text-gray-400 aspect-[4/3]">
                    <svg className="w-8 h-8 mb-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    </svg>
                    <span className="text-xs font-medium">{t('review_modal.no_document')}</span>
                </div>
            )}
        </div>
    );
}

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

export default function ClientDetails() {
    const { id: userId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('users');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('kyc'); // kyc | addresses | bookings | transactions | reviews
    const [isRejecting, setIsRejecting] = useState(false);
    const [reason, setReason] = useState('');
    const [reasonError, setReasonError] = useState('');

    const { data: responseData, isLoading, isError } = useQuery({
        queryKey: ['user-review', userId],
        queryFn: async () => (await axiosInstance.get(`/admin/users/${userId}`)).data.data,
    });

    const verifyMutation = useMutation({
        mutationFn: (payload) => axiosInstance.put(`/admin/users/${userId}/verify`, payload),
        onSuccess: (response, payload) => {
            toast.success(
                response.data.message ||
                    t(payload.action === 'approve' ? 'review_modal.approve_success' : 'review_modal.reject_success'),
            );
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setIsRejecting(false);
            setReason('');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || t('review_modal.error'));
        },
    });

    const approve = () => verifyMutation.mutate({ action: 'approve' });

    const submitRejection = () => {
        if (!reason.trim()) {
            setReasonError(t('review_modal.reject_reason_required'));
            return;
        }
        verifyMutation.mutate({ action: 'reject', rejection_reason: reason.trim() });
    };

    const userProfile = responseData?.user || {};
    const addresses = responseData?.addresses || [];
    const bookings = responseData?.bookings || [];
    const reviews = responseData?.reviews || [];
    const transactions = responseData?.transactions || [];

    const status = userProfile?.verification_status || 'unverified';
    const docs = userProfile?.verification_documents || {};
    const busy = verifyMutation.isPending;
    const isPending = status === 'pending';

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

    // Total spent computation
    const totalSpent = bookings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);

    return (
        <div className="space-y-6 font-main max-w-7xl mx-auto pb-12">
            {/* Top Navigation Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
                <div>
                    <button
                        onClick={() => navigate('/clients')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E91E63] transition-colors mb-1.5 outline-none group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>{isArabic ? 'العودة لقائمة العملاء' : 'Back to Clients'}</span>
                    </button>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'ملف العميل' : 'Client Profile'}
                    </h2>
                </div>
            </div>

            {isLoading ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-20 flex flex-col items-center justify-center text-gray-400">
                    <svg className="animate-spin h-9 w-9 text-[#E91E63] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="font-bold text-sm text-gray-600">{isArabic ? 'جاري تحميل ملف العميل...' : 'Loading client details...'}</p>
                </div>
            ) : isError || !responseData ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-16 text-center text-rose-600 font-bold">
                    {isArabic ? 'حدث خطأ أثناء تحميل ملف العميل.' : 'Error loading client details.'}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Top Hero Customer Profile Banner */}
                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                            <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-start">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 border-2 border-pink-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                    {userProfile.image ? (
                                        <img src={userProfile.image} alt={userProfile.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[#E91E63] font-black text-3xl">{(userProfile.full_name || '?').charAt(0)}</span>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                                        <h3 className="text-2xl font-black text-gray-900">{userProfile.full_name || '-'}</h3>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${STATUS_STYLES[status] || STATUS_STYLES.unverified}`}>
                                            <span className={`w-2 h-2 rounded-full ${STATUS_DOTS[status] || 'bg-gray-400'}`} />
                                            {t(`verification.${status}`, { defaultValue: status })}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-500 flex items-center justify-center md:justify-start gap-3" dir="ltr">
                                        <span>📱 {userProfile.mobile_number || '-'}</span>
                                        {userProfile.email && (
                                            <>
                                                <span>•</span>
                                                <span>✉️ {userProfile.email}</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Verification Actions (if Pending) */}
                            {isPending && hasPermission('users.verify') && (
                                <div className="flex items-center gap-2.5 shrink-0">
                                    {isRejecting ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => { setIsRejecting(false); setReason(''); setReasonError(''); }}
                                                disabled={busy}
                                                className="px-4 h-10 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 text-xs"
                                            >
                                                {t('review_modal.cancel')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={submitRejection}
                                                disabled={busy}
                                                className="px-4 h-10 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-60 text-xs"
                                            >
                                                {busy ? '…' : t('review_modal.confirm_reject')}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setIsRejecting(true)}
                                                disabled={busy}
                                                className="px-4 h-10 rounded-xl font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-50 text-xs"
                                            >
                                                {t('review_modal.reject')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={approve}
                                                disabled={busy}
                                                className="px-4 h-10 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-60 text-xs shadow-sm"
                                            >
                                                {t('review_modal.approve')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100">
                            <StatCard
                                label={isArabic ? 'إجمالي الحجوزات' : 'Total Bookings'}
                                value={bookings.length}
                                bg="bg-blue-50 text-blue-600"
                                icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                            />
                            <StatCard
                                label={isArabic ? 'إجمالي الإنفاق' : 'Total Spent'}
                                value={`${totalSpent.toFixed(2)} EGP`}
                                accent="text-emerald-600"
                                bg="bg-emerald-50 text-emerald-600"
                                icon={<svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" /></svg>}
                            />
                            <StatCard
                                label={isArabic ? 'العناوين المسجلة' : 'Saved Addresses'}
                                value={addresses.length}
                                accent="text-sky-600"
                                bg="bg-sky-50 text-sky-600"
                                icon={<svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>}
                            />
                            <StatCard
                                label={isArabic ? 'رصيد النقاط' : 'Loyalty Points'}
                                value={`${userProfile.points || 0} Pts`}
                                accent="text-[#E91E63]"
                                bg="bg-pink-50 text-[#E91E63]"
                                icon={<svg className="w-5 h-5 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.488-.41.886-.832.632l-4.703-2.827a.563.563 0 00-.58 0l-4.703 2.827c-.423.254-.948-.144-.832-.632l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>}
                            />
                        </div>
                    </div>

                    {/* Main Content Layout Grid */}
                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        {/* Side Navigation Tabs */}
                        <div className="w-full lg:w-64 bg-white border border-gray-100 rounded-3xl p-3 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto shadow-2xs">
                            {sideMenuItem('kyc', t('review_modal.profile_tab', { defaultValue: isArabic ? 'الملف والتوثيق' : 'Profile & KYC' }), 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z')}
                            {sideMenuItem('addresses', isArabic ? 'العناوين' : 'Addresses', 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z', addresses.length)}
                            {sideMenuItem('bookings', isArabic ? 'الحجوزات' : 'Bookings', 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', bookings.length)}
                            {sideMenuItem('transactions', isArabic ? 'سجل النقاط' : 'Points Ledger', 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', transactions.length)}
                            {sideMenuItem('reviews', isArabic ? 'التقييمات' : 'Reviews', 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', reviews.length)}
                        </div>

                        {/* Active Tab Content Area */}
                        <div className="flex-1 w-full min-w-0 space-y-6">
                            {/* Tab: KYC & Profile */}
                            {activeTab === 'kyc' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                        <h4 className="text-sm font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                                            </svg>
                                            <span>{isArabic ? 'المعلومات الأساسية' : 'Basic Information'}</span>
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            <div className="p-3.5 bg-gray-50/60 border border-gray-100 rounded-2xl flex justify-between items-center">
                                                <span className="text-gray-400 font-bold uppercase">{t('review_modal.id_number')}</span>
                                                <span className="font-extrabold text-gray-900">{userProfile.id_number || '-'}</span>
                                            </div>
                                            <div className="p-3.5 bg-gray-50/60 border border-gray-100 rounded-2xl flex justify-between items-center">
                                                <span className="text-gray-400 font-bold uppercase">{t('review_modal.email')}</span>
                                                <span className="font-extrabold text-gray-900 break-all">{userProfile.email || '-'}</span>
                                            </div>
                                            <div className="p-3.5 bg-gray-50/60 border border-gray-100 rounded-2xl flex justify-between items-center">
                                                <span className="text-gray-400 font-bold uppercase">{isArabic ? 'الجنس' : 'Gender'}</span>
                                                <span className="font-extrabold text-gray-900">{userProfile.gender || '—'}</span>
                                            </div>
                                            <div className="p-3.5 bg-gray-50/60 border border-gray-100 rounded-2xl flex justify-between items-center">
                                                <span className="text-gray-400 font-bold uppercase">{isArabic ? 'اللغة المفضلة' : 'Preferred Language'}</span>
                                                <span className="font-extrabold text-gray-900 uppercase">{userProfile.preferred_language || '—'}</span>
                                            </div>

                                            {userProfile.invited_by && (
                                                <div className="sm:col-span-2 p-4 bg-pink-50/50 border border-pink-100 rounded-2xl flex items-center justify-between">
                                                    <div>
                                                        <span className="block text-[11px] font-bold text-[#E91E63] uppercase tracking-wider mb-0.5">{isArabic ? 'تمت دعوته بواسطة' : 'Invited By'}</span>
                                                        <span className="text-sm font-extrabold text-gray-900">{userProfile.invited_by.full_name} ({userProfile.invited_by.referral_code})</span>
                                                    </div>
                                                    <div className="text-end">
                                                        <span className="block text-[11px] text-gray-400 font-bold uppercase mb-0.5">{isArabic ? 'البيانات' : 'Contact'}</span>
                                                        <span className="text-xs text-gray-700 font-bold" dir="ltr">{userProfile.invited_by.phone_number || userProfile.invited_by.email || '-'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {status === 'rejected' && userProfile.rejection_reason && (
                                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700">
                                            <span className="font-black">{t('review_modal.previous_reason')}: </span>
                                            <span>{userProfile.rejection_reason}</span>
                                        </div>
                                    )}

                                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                        <h4 className="text-sm font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                            </svg>
                                            <span>{t('review_modal.documents')}</span>
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            <DocumentTile label={t('review_modal.id_front')} url={docs.id_front} t={t} />
                                            <DocumentTile label={t('review_modal.id_back')} url={docs.id_back} t={t} />
                                            {docs.selfie && <DocumentTile label={t('review_modal.selfie')} url={docs.selfie} t={t} />}
                                        </div>
                                    </div>

                                    {isRejecting && (
                                        <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6">
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                                {t('review_modal.reject_reason_label')} <span className="text-rose-500">*</span>
                                            </label>
                                            <textarea
                                                value={reason}
                                                onChange={(e) => { setReason(e.target.value); if (reasonError) setReasonError(''); }}
                                                rows={3}
                                                placeholder={t('review_modal.reject_reason_placeholder')}
                                                className={`w-full px-3.5 py-2.5 border rounded-xl text-gray-800 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#E91E63]/10 outline-none transition-all resize-none text-xs font-medium ${
                                                    reasonError ? 'border-rose-500' : 'border-gray-200'
                                                }`}
                                            />
                                            {reasonError && <p className="text-rose-500 text-xs mt-1 font-bold">{reasonError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab: Addresses */}
                            {activeTab === 'addresses' && (
                                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-center text-xs border-collapse">
                                            <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold border-b border-gray-100 text-[11px]">
                                                <tr>
                                                    <th className="p-4 text-center">{isArabic ? 'العنوان' : 'Label'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'المدينة / المنطقة' : 'City / Area'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'الشارع' : 'Street'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'التفاصيل' : 'Details'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {addresses.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="p-12 text-center text-gray-400 text-xs bg-white font-medium">
                                                            {isArabic ? 'لا توجد عناوين مسجلة لهذا العميل.' : 'No addresses registered.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    addresses.map((addr) => (
                                                        <tr key={addr.id} className="hover:bg-gray-50/60 transition-colors bg-white">
                                                            <td className="p-4 font-bold text-gray-900 text-start">{addr.label || '-'}</td>
                                                            <td className="p-4 font-medium text-gray-700 text-start">{addr.city?.name_ar || addr.city_name || '-'} / {addr.area?.name_ar || addr.area_name || '-'}</td>
                                                            <td className="p-4 text-gray-600 text-start">{addr.street || '-'}</td>
                                                            <td className="p-4 text-gray-600 font-medium text-start">
                                                                {addr.building_no ? `${isArabic ? 'مبنى' : 'Bldg'} ${addr.building_no}, ${isArabic ? 'طابق' : 'Flr'} ${addr.floor_no}, ${isArabic ? 'شقة' : 'Appt'} ${addr.apartment_no}` : addr.description || '-'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Bookings */}
                            {activeTab === 'bookings' && (
                                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-center text-xs border-collapse">
                                            <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold border-b border-gray-100 text-[11px]">
                                                <tr>
                                                    <th className="p-4 text-center">{isArabic ? 'رقم الحجز' : 'Ref'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'الخدمة' : 'Service'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'العامل' : 'Worker'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'التاريخ' : 'Date'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'القيمة' : 'Amount'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'الحالة' : 'Status'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {bookings.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="p-12 text-center text-gray-400 text-xs bg-white font-medium">
                                                            {isArabic ? 'لا توجد حجوزات مسجلة لهذا العميل.' : 'No bookings registered.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    bookings.map((b) => (
                                                        <tr key={b.id} className="hover:bg-gray-50/60 transition-colors bg-white">
                                                            <td className="p-4 font-mono font-bold text-start">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => navigate(`/bookings/${b.id}`)}
                                                                    className="text-[#E91E63] font-bold hover:underline outline-none"
                                                                >
                                                                    #{b.booking_ref}
                                                                </button>
                                                            </td>
                                                            <td className="p-4 font-bold text-gray-900 text-start">{b.service_name}</td>
                                                            <td className="p-4 text-gray-600 font-medium text-start">{b.worker_name || '—'}</td>
                                                            <td className="p-4 whitespace-nowrap text-gray-500 font-medium text-start">{b.booking_date}</td>
                                                            <td className="p-4 font-extrabold text-gray-900 whitespace-nowrap text-start">{b.total_amount} EGP</td>
                                                            <td className="p-4 text-center">
                                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                                                                    b.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                    b.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                                    b.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                    'bg-blue-50 text-blue-700 border-blue-200'
                                                                }`}>
                                                                    {b.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Transactions / Points Ledger */}
                            {activeTab === 'transactions' && (
                                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-center text-xs border-collapse">
                                            <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold border-b border-gray-100 text-[11px]">
                                                <tr>
                                                    <th className="p-4 text-center">{isArabic ? 'عنوان العملية' : 'Title'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'النوع' : 'Type'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'النقاط' : 'Amount'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'التاريخ' : 'Date'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {transactions.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="p-12 text-center text-gray-400 text-xs bg-white font-medium">
                                                            {isArabic ? 'لا توجد سجلات نقاط مسجلة.' : 'No transactions recorded.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    transactions.map((tx) => {
                                                        const isCredit = tx.type === 'earn' || tx.type === 'refund' || (tx.type === 'adjustment' && tx.amount > 0);
                                                        return (
                                                            <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors bg-white">
                                                                <td className="p-4 font-bold text-gray-900 text-start">{tx.title || '-'}</td>
                                                                <td className="p-4 font-semibold capitalize text-gray-600 text-start">{tx.type}</td>
                                                                <td className={`p-4 font-black text-start ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                    {isCredit ? '+' : '-'}{Math.abs(tx.amount)} Pts
                                                                </td>
                                                                <td className="p-4 text-gray-500 font-medium whitespace-nowrap text-start">{tx.created_at}</td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Reviews */}
                            {activeTab === 'reviews' && (
                                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-center text-xs border-collapse">
                                            <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold border-b border-gray-100 text-[11px]">
                                                <tr>
                                                    <th className="p-4 text-center">{isArabic ? 'رقم الحجز' : 'Booking Ref'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'التقييم لـ' : 'Rated Target'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'النجوم' : 'Rating'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'التعليق' : 'Comment'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'التاريخ' : 'Date'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {reviews.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="p-12 text-center text-gray-400 text-xs bg-white font-medium">
                                                            {isArabic ? 'لا توجد تقييمات مكتوبة لهذا العميل.' : 'No reviews submitted.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    reviews.map((r) => (
                                                        <tr key={r.id} className="hover:bg-gray-50/60 transition-colors bg-white">
                                                            <td className="p-4 font-mono font-bold text-start">
                                                                {r.booking_id ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => navigate(`/bookings/${r.booking_id}`)}
                                                                        className="text-[#E91E63] font-bold hover:underline outline-none"
                                                                    >
                                                                        #{r.booking_ref}
                                                                    </button>
                                                                ) : (r.booking_ref || '—')}
                                                            </td>
                                                            <td className="p-4 font-bold text-gray-900 text-start">{r.reviewable_name}</td>
                                                            <td className="p-4 text-amber-500 font-extrabold whitespace-nowrap text-center">⭐ {r.rating} / 5</td>
                                                            <td className="p-4 max-w-[240px] truncate text-gray-600 font-medium text-start" title={r.comment}>{r.comment || '-'}</td>
                                                            <td className="p-4 text-gray-500 font-medium whitespace-nowrap text-start">{r.created_at}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
