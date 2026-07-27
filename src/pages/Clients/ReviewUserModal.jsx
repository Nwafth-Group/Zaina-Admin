import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

// Badge styling per verification status.
const STATUS_STYLES = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-red-100 text-red-700',
    unverified: 'bg-gray-100 text-gray-600',
};

// A single KYC document tile: shows the image (click → full size) or a placeholder.
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

export default function ReviewUserModal({ userId, onClose }) {
    const { t, i18n } = useTranslation('users');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('kyc'); // 'kyc', 'addresses', 'bookings', 'transactions', 'reviews'
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
            onClose();
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

    const tabClass = (tabId) => `px-4 py-2 text-sm font-bold border-b-2 transition-all duration-150 whitespace-nowrap ${
        activeTab === tabId 
        ? 'border-[#E91E63] text-[#E91E63]' 
        : 'border-transparent text-gray-400 hover:text-gray-600'
    }`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 font-main">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden relative">

                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{isArabic ? 'ملف العميل الكامل' : 'Full Client Profile'}</h3>
                        <p className="text-sm text-gray-500 mt-1">{isArabic ? 'استعراض كل البيانات المتعلقة بالعميل وحالة توثيقه' : 'Review everything belonging to this customer & kyc status'}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tab switcher */}
                {!isLoading && !isError && (
                    <div className="flex border-b border-gray-100 px-6 overflow-x-auto bg-white sticky top-0 z-10">
                        <button onClick={() => setActiveTab('kyc')} className={tabClass('kyc')}>
                            {isArabic ? 'الملف الشخصي والتوثيق' : 'Profile & KYC'}
                        </button>
                        <button onClick={() => setActiveTab('addresses')} className={tabClass('addresses')}>
                            {isArabic ? `العناوين (${addresses.length})` : `Addresses (${addresses.length})`}
                        </button>
                        <button onClick={() => setActiveTab('bookings')} className={tabClass('bookings')}>
                            {isArabic ? `الحجوزات (${bookings.length})` : `Bookings (${bookings.length})`}
                        </button>
                        <button onClick={() => setActiveTab('transactions')} className={tabClass('transactions')}>
                            {isArabic ? `سجل النقاط (${transactions.length})` : `Points Ledger (${transactions.length})`}
                        </button>
                        <button onClick={() => setActiveTab('reviews')} className={tabClass('reviews')}>
                            {isArabic ? `التقييمات (${reviews.length})` : `Reviews (${reviews.length})`}
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                            <svg className="animate-spin h-7 w-7 text-[#E91E63] mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('review_modal.loading')}
                        </div>
                    ) : isError ? (
                        <div className="py-12 text-center text-red-500">{t('review_modal.error')}</div>
                    ) : (
                        <div className="space-y-6">
                            
                            {/* Tab: KYC and Main Info */}
                            {activeTab === 'kyc' && (
                                <div className="space-y-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            {userProfile.image ? (
                                                <img src={userProfile.image} alt={userProfile.full_name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold">
                                                    {(userProfile.full_name || '?').charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold text-gray-800">{userProfile.full_name || '-'}</p>
                                                <p className="text-sm text-gray-500" dir="ltr">{userProfile.mobile_number || userProfile.email || '-'}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLES[status] || STATUS_STYLES.unverified}`}>
                                            {t(`verification.${status}`, { defaultValue: status })}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-gray-100 pt-4">
                                        <div>
                                            <span className="block text-gray-400">{t('review_modal.id_number')}</span>
                                            <span className="text-gray-800">{userProfile.id_number || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-400">{t('review_modal.email')}</span>
                                            <span className="text-gray-800 break-all">{userProfile.email || '-'}</span>
                                        </div>
                                        {userProfile.invited_by && (
                                            <div className="col-span-2 mt-2 p-3 bg-pink-50/50 border border-pink-100/50 rounded-xl flex items-center justify-between">
                                                <div>
                                                    <span className="block text-xs font-semibold text-pink-600">{isArabic ? 'تمت دعوته بواسطة' : 'Invited By'}</span>
                                                    <span className="text-sm font-bold text-gray-800">{userProfile.invited_by.full_name} ({userProfile.invited_by.referral_code})</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-xs text-gray-400">{isArabic ? 'البريد الإلكتروني / الهاتف' : 'Email / Phone'}</span>
                                                    <span className="text-xs text-gray-600" dir="ltr">{userProfile.invited_by.phone_number || userProfile.invited_by.email || '-'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {status === 'rejected' && userProfile.rejection_reason && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                                            <span className="font-medium">{t('review_modal.previous_reason')}: </span>
                                            {userProfile.rejection_reason}
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('review_modal.documents')}</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            <DocumentTile label={t('review_modal.id_front')} url={docs.id_front} t={t} />
                                            <DocumentTile label={t('review_modal.id_back')} url={docs.id_back} t={t} />
                                            {docs.selfie && <DocumentTile label={t('review_modal.selfie')} url={docs.selfie} t={t} />}
                                        </div>
                                    </div>

                                    {isRejecting && (
                                        <div className="border-t border-gray-100 pt-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                </div>
                            )}

                            {/* Tab: Addresses */}
                            {activeTab === 'addresses' && (
                                <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/30">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left rtl:text-right text-xs">
                                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold border-b border-gray-100">
                                                <tr>
                                                    <th className="p-4">{isArabic ? 'العنوان' : 'Label'}</th>
                                                    <th className="p-4">{isArabic ? 'منطقة التغطية' : 'Service Zone'}</th>
                                                    <th className="p-4">{isArabic ? 'الشارع' : 'Street'}</th>
                                                    <th className="p-4">{isArabic ? 'التفاصيل' : 'Details'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {addresses.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="p-8 text-center text-gray-400 text-sm">
                                                            {isArabic ? 'لا توجد عناوين مسجلة.' : 'No addresses registered.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    addresses.map((addr) => (
                                                        <tr key={addr.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="p-4 font-semibold text-gray-700">{addr.label || '-'}</td>
                                                            <td className="p-4">{addr.service_zone?.name || addr.service_zone_name || addr.serviceZone?.name || '-'}</td>
                                                            <td className="p-4">{addr.street || '-'}</td>
                                                            <td className="p-4">
                                                                {addr.building_no ? `${isArabic ? 'مبنى' : 'Bldg'} ${addr.building_no}, ${isArabic ? 'طابق' : 'Flr'} ${addr.floor ?? addr.floor_no ?? '-'}, ${isArabic ? 'شقة' : 'Appt'} ${addr.apartment_no ?? '-'}` : addr.description || '-'}
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
                                <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/30">
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
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {bookings.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="p-8 text-center text-gray-400 text-sm">
                                                            {isArabic ? 'لا توجد حجوزات مسجلة.' : 'No bookings registered.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    bookings.map((b) => (
                                                        <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="p-4 font-mono font-bold text-[#E91E63]">{b.booking_ref}</td>
                                                            <td className="p-4 font-semibold text-gray-800">{b.service_name}</td>
                                                            <td className="p-4 text-gray-600">{b.worker_name}</td>
                                                            <td className="p-4 whitespace-nowrap">{b.booking_date}</td>
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
                                <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/30">
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
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {transactions.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" className="p-8 text-center text-gray-400 text-sm">
                                                            {isArabic ? 'لا توجد عمليات مسجلة.' : 'No transactions recorded.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    transactions.map((tx) => {
                                                        const isCredit = tx.type === 'earn' || tx.type === 'refund' || (tx.type === 'adjustment' && tx.amount > 0);
                                                        return (
                                                            <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
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
                                <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/30">
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
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {reviews.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="p-8 text-center text-gray-400 text-sm">
                                                            {isArabic ? 'لا توجد تقييمات مكتوبة.' : 'No reviews submitted.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    reviews.map((r) => (
                                                        <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="p-4 font-mono font-bold text-gray-800">{r.booking_ref}</td>
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
                    )}
                </div>

                {/* Footer actions — only while the request is pending review and the user is on the main kyc tab */}
                {!isLoading && !isError && isPending && activeTab === 'kyc' && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 rtl:flex-row-reverse justify-end sticky bottom-0">
                        {isRejecting ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => { setIsRejecting(false); setReason(''); setReasonError(''); }}
                                    disabled={busy}
                                    className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                                >
                                    {t('review_modal.cancel')}
                                </button>
                                <button
                                    type="button"
                                    onClick={submitRejection}
                                    disabled={busy}
                                    className="px-5 py-2.5 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60 min-w-[140px]"
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
                                    className="px-5 py-2.5 rounded-xl font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    {t('review_modal.reject')}
                                </button>
                                <button
                                    type="button"
                                    onClick={approve}
                                    disabled={busy}
                                    className="px-5 py-2.5 rounded-xl font-medium text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-60 min-w-[120px]"
                                >
                                    {busy ? '…' : t('review_modal.approve')}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
