import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { hasPermission } from '../../utils/permissions.js';

const STATUS_STYLES = {
    approved: 'bg-green-100 text-green-700 border-green-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    unverified: 'bg-gray-100 text-gray-600 border-gray-200',
};

function DocumentTile({ label, url, t }) {
    return (
        <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-500 mb-1.5">{label}</span>
            {url ? (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t('review_modal.view_full')}
                    className="group relative block rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-[4/3]"
                >
                    <img src={url} alt={label} className="w-full h-full object-cover" loading="lazy" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-all text-sm font-medium">
                        {t('review_modal.view_full')}
                    </span>
                </a>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-gray-400 aspect-[4/3]">
                    <svg className="w-7 h-7 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">{t('review_modal.no_document')}</span>
                </div>
            )}
        </div>
    );
}

const StatCard = ({ label, value, accent = 'text-gray-800' }) => (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 text-center shadow-sm">
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
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

    // Fetch the full user details
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

    const sideMenuItem = (key, label, iconPath) => {
        const active = activeTab === key;
        return (
            <button
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-bold transition-all text-start ${active ? 'bg-[#FDF0F3] text-[#E91E63]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                </svg>
                {label}
            </button>
        );
    };

    return (
        <div className="space-y-6 font-main">
            {/* Back button and page title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <button 
                        onClick={() => navigate('/clients')} 
                        className="flex items-center gap-1 text-gray-500 hover:text-[#E91E63] transition-colors text-xs font-bold mb-2 outline-none"
                    >
                        {isArabic ? '← العودة لقائمة العملاء' : '← Back to Clients'}
                    </button>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                        {isArabic ? 'تفاصيل ملف العميل' : 'Client Profile Details'}
                    </h2>
                </div>
            </div>

            {isLoading ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center text-gray-500">
                    <svg className="animate-spin h-8 w-8 text-[#E91E63] mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isArabic ? 'جاري تحميل ملف العميل...' : 'Loading client details...'}
                </div>
            ) : isError || !responseData ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center text-red-500 font-bold">
                    {isArabic ? 'خطأ في تحميل تفاصيل العميل.' : 'Error loading customer details.'}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Top profile hero card (Identical to worker layout) */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                            {userProfile.image ? (
                                <img src={userProfile.image} alt={userProfile.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-gray-400 font-bold text-3xl">{(userProfile.full_name || '?').charAt(0)}</span>
                            )}
                        </div>
                        <div className="flex-1 text-center md:text-start min-w-0">
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                                <h3 className="text-2xl font-bold text-gray-800">{userProfile.full_name || '-'}</h3>
                                <span className={`inline-block mx-auto md:mx-0 px-3 py-1 rounded-full text-xs font-bold border w-max whitespace-nowrap ${STATUS_STYLES[status] || STATUS_STYLES.unverified}`}>
                                    {t(`verification.${status}`, { defaultValue: status })}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1" dir="ltr">{userProfile.mobile_number || userProfile.email || '-'}</p>
                            <p className="text-xs text-gray-400 mt-1">{isArabic ? `نوع الحساب: عميل` : `Account: Customer`}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                            <StatCard label={isArabic ? 'الحجوزات' : 'Bookings'} value={bookings.length} />
                            <StatCard label={isArabic ? 'العناوين' : 'Addresses'} value={addresses.length} accent="text-blue-600" />
                            <StatCard label={isArabic ? 'النقاط' : 'Points'} value={userProfile.points || 0} accent="text-[#E91E63]" />
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        {/* Side menu navigation tabs */}
                        <div className="w-full lg:w-56 bg-white border border-gray-100 rounded-3xl p-4 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto">
                            {sideMenuItem('kyc', t('review_modal.profile_tab', { defaultValue: isArabic ? 'الملف الشخصي والتوثيق' : 'Profile & KYC' }), 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z')}
                            {sideMenuItem('addresses', isArabic ? `العناوين (${addresses.length})` : `Addresses (${addresses.length})`, 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z')}
                            {sideMenuItem('bookings', isArabic ? `الحجوزات (${bookings.length})` : `Bookings (${bookings.length})`, 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')}
                            {sideMenuItem('transactions', isArabic ? `سجل النقاط (${transactions.length})` : `Points Ledger (${transactions.length})`, 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z')}
                            {sideMenuItem('reviews', isArabic ? `التقييمات (${reviews.length})` : `Reviews (${reviews.length})`, 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z')}
                        </div>

                        {/* Content area */}
                        <div className="flex-1 w-full min-w-0 space-y-6">
                            {/* Tab: KYC & Profile */}
                            {activeTab === 'kyc' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                        <h4 className="text-sm font-bold text-gray-700 mb-4">{isArabic ? 'المعلومات الأساسية' : 'Basic Information'}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                                            <div className="flex justify-between py-2 border-b border-gray-50">
                                                <span className="text-gray-400 font-medium">{t('review_modal.id_number')}</span>
                                                <span className="font-semibold text-gray-800">{userProfile.id_number || '-'}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-gray-50">
                                                <span className="text-gray-400 font-medium">{t('review_modal.email')}</span>
                                                <span className="font-semibold text-gray-800 break-all">{userProfile.email || '-'}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-gray-50">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'الجنس' : 'Gender'}</span>
                                                <span className="font-semibold text-gray-800">{userProfile.gender || '—'}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-gray-50">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'اللغة المفضلة' : 'Preferred Language'}</span>
                                                <span className="font-semibold text-gray-800 uppercase">{userProfile.preferred_language || '—'}</span>
                                            </div>
                                            {userProfile.invited_by && (
                                                <div className="col-span-1 sm:col-span-2 mt-2 p-4 bg-pink-50/50 border border-pink-100/50 rounded-2xl flex items-center justify-between">
                                                    <div>
                                                        <span className="block text-xs font-bold text-pink-600 mb-0.5">{isArabic ? 'تمت دعوته بواسطة' : 'Invited By'}</span>
                                                        <span className="text-sm font-extrabold text-gray-800">{userProfile.invited_by.full_name} ({userProfile.invited_by.referral_code})</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-xs text-gray-400 mb-0.5">{isArabic ? 'البريد الإلكتروني / الهاتف' : 'Email / Phone'}</span>
                                                        <span className="text-xs text-gray-600 font-semibold" dir="ltr">{userProfile.invited_by.phone_number || userProfile.invited_by.email || '-'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {status === 'rejected' && userProfile.rejection_reason && (
                                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
                                            <span className="font-bold">{t('review_modal.previous_reason')}: </span>
                                            {userProfile.rejection_reason}
                                        </div>
                                    )}

                                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                        <h4 className="text-sm font-bold text-gray-700 mb-4">{t('review_modal.documents')}</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            <DocumentTile label={t('review_modal.id_front')} url={docs.id_front} t={t} />
                                            <DocumentTile label={t('review_modal.id_back')} url={docs.id_back} t={t} />
                                            {docs.selfie && <DocumentTile label={t('review_modal.selfie')} url={docs.selfie} t={t} />}
                                        </div>
                                    </div>

                                    {isRejecting && (
                                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                {t('review_modal.reject_reason_label')} <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                value={reason}
                                                onChange={(e) => { setReason(e.target.value); if (reasonError) setReasonError(''); }}
                                                rows={3}
                                                placeholder={t('review_modal.reject_reason_placeholder')}
                                                className={`w-full px-4 py-3 border rounded-xl text-gray-800 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#E91E63] outline-none transition-all resize-none ${
                                                    reasonError ? 'border-red-500' : 'border-gray-200'
                                                }`}
                                            />
                                            {reasonError && <p className="text-red-500 text-xs mt-1 px-1">{reasonError}</p>}
                                        </div>
                                    )}

                                    {/* Action buttons (only for pending users) */}
                                    {isPending && hasPermission('users.verify') && (
                                        <div className="flex gap-3 justify-end">
                                            {isRejecting ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setIsRejecting(false); setReason(''); setReasonError(''); }}
                                                        disabled={busy}
                                                        className="px-5 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 text-sm"
                                                    >
                                                        {t('review_modal.cancel')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={submitRejection}
                                                        disabled={busy}
                                                        className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60 min-w-[140px] text-sm"
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
                                                        className="px-5 py-2.5 rounded-xl font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 text-sm"
                                                    >
                                                        {t('review_modal.reject')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={approve}
                                                        disabled={busy}
                                                        className="px-5 py-2.5 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-60 min-w-[120px] text-sm"
                                                    >
                                                        {t('review_modal.approve')}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab: Addresses */}
                            {activeTab === 'addresses' && (
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left rtl:text-right text-xs">
                                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-100">
                                                <tr>
                                                    <th className="p-4">{isArabic ? 'العنوان' : 'Label'}</th>
                                                    <th className="p-4">{isArabic ? 'المدينة / المنطقة' : 'City / Area'}</th>
                                                    <th className="p-4">{isArabic ? 'الشارع' : 'Street'}</th>
                                                    <th className="p-4">{isArabic ? 'التفاصيل' : 'Details'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {addresses.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="p-8 text-center text-gray-400 text-sm bg-white">
                                                            {isArabic ? 'لا توجد عناوين مسجلة.' : 'No addresses registered.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    addresses.map((addr) => (
                                                        <tr key={addr.id} className="hover:bg-gray-50/50 transition-colors bg-white">
                                                            <td className="p-4 font-bold text-gray-700">{addr.label || '-'}</td>
                                                            <td className="p-4">{addr.city?.name_ar || addr.city_name || '-'} / {addr.area?.name_ar || addr.area_name || '-'}</td>
                                                            <td className="p-4">{addr.street || '-'}</td>
                                                            <td className="p-4 text-gray-600">
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
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left rtl:text-right text-xs">
                                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-100">
                                                <tr>
                                                    <th className="p-4">{isArabic ? 'رقم الحجز' : 'Ref'}</th>
                                                    <th className="p-4">{isArabic ? 'الخدمة' : 'Service'}</th>
                                                    <th className="p-4">{isArabic ? 'العامل' : 'Worker'}</th>
                                                    <th className="p-4">{isArabic ? 'التاريخ' : 'Date'}</th>
                                                    <th className="p-4">{isArabic ? 'القيمة' : 'Amount'}</th>
                                                    <th className="p-4">{isArabic ? 'الحالة' : 'Status'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {bookings.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="p-8 text-center text-gray-400 text-sm bg-white">
                                                            {isArabic ? 'لا توجد حجوزات مسجلة.' : 'No bookings registered.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    bookings.map((b) => (
                                                        <tr key={b.id} className="hover:bg-gray-50/50 transition-colors bg-white">
                                                            <td className="p-4 font-mono font-bold">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => navigate(`/bookings/${b.id}`)}
                                                                    className="text-[#E91E63] hover:underline focus:outline-none"
                                                                >
                                                                    {b.booking_ref}
                                                                </button>
                                                            </td>
                                                            <td className="p-4 font-semibold text-gray-800">{b.service_name}</td>
                                                            <td className="p-4 text-gray-600">{b.worker_name}</td>
                                                            <td className="p-4 whitespace-nowrap text-gray-500">{b.booking_date}</td>
                                                            <td className="p-4 font-bold text-gray-800 whitespace-nowrap">{b.total_amount} EGP</td>
                                                            <td className="p-4">
                                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                                    b.status === 'completed' ? 'bg-green-50 text-green-600' :
                                                                    b.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                                                                    b.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                                                                    'bg-blue-50 text-blue-600'
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

                            {/* Tab: Transactions */}
                            {activeTab === 'transactions' && (
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left rtl:text-right text-xs">
                                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-100">
                                                <tr>
                                                    <th className="p-4">{isArabic ? 'العملية' : 'Title'}</th>
                                                    <th className="p-4">{isArabic ? 'النوع' : 'Type'}</th>
                                                    <th className="p-4">{isArabic ? 'النقاط' : 'Amount'}</th>
                                                    <th className="p-4">{isArabic ? 'التاريخ' : 'Date'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {transactions.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="p-8 text-center text-gray-400 text-sm bg-white">
                                                            {isArabic ? 'لا توجد عمليات مسجلة.' : 'No transactions recorded.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    transactions.map((tx) => {
                                                        const isCredit = tx.type === 'earn' || tx.type === 'refund' || (tx.type === 'adjustment' && tx.amount > 0);
                                                        return (
                                                            <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors bg-white">
                                                                <td className="p-4 font-semibold text-gray-700">{tx.title || '-'}</td>
                                                                <td className="p-4 capitalize">{tx.type}</td>
                                                                <td className={`p-4 font-bold ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                    {isCredit ? '+' : '-'}{Math.abs(tx.amount)} Pts
                                                                </td>
                                                                <td className="p-4 text-gray-500 whitespace-nowrap">{tx.created_at}</td>
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
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left rtl:text-right text-xs">
                                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-100">
                                                <tr>
                                                    <th className="p-4">{isArabic ? 'رقم الحجز' : 'Booking Ref'}</th>
                                                    <th className="p-4">{isArabic ? 'التقييم لـ' : 'Rated Target'}</th>
                                                    <th className="p-4">{isArabic ? 'النجوم' : 'Rating'}</th>
                                                    <th className="p-4">{isArabic ? 'التعليق' : 'Comment'}</th>
                                                    <th className="p-4">{isArabic ? 'التاريخ' : 'Date'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {reviews.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="p-8 text-center text-gray-400 text-sm bg-white">
                                                            {isArabic ? 'لا توجد تقييمات مكتوبة.' : 'No reviews submitted.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    reviews.map((r) => (
                                                        <tr key={r.id} className="hover:bg-gray-50/50 transition-colors bg-white">
                                                            <td className="p-4 font-mono font-bold">
                                                                {r.booking_id ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => navigate(`/bookings/${r.booking_id}`)}
                                                                        className="text-[#E91E63] hover:underline focus:outline-none"
                                                                    >
                                                                        {r.booking_ref}
                                                                    </button>
                                                                ) : r.booking_ref}
                                                            </td>
                                                            <td className="p-4 font-semibold text-gray-800">{r.reviewable_name}</td>
                                                            <td className="p-4 text-amber-500 font-bold whitespace-nowrap">⭐ {r.rating} / 5</td>
                                                            <td className="p-4 max-w-[200px] truncate" title={r.comment}>{r.comment || '-'}</td>
                                                            <td className="p-4 text-gray-500 whitespace-nowrap">{r.created_at}</td>
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
