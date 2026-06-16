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
    const { t } = useTranslation('users');
    const queryClient = useQueryClient();

    const [isRejecting, setIsRejecting] = useState(false);
    const [reason, setReason] = useState('');
    const [reasonError, setReasonError] = useState('');

    // Fetch the full user so the KYC signed URLs are fresh (they expire in 30 min).
    const { data: user, isLoading, isError } = useQuery({
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

    const status = user?.verification_status || 'unverified';
    const docs = user?.verification_documents || {};
    const busy = verifyMutation.isPending;
    // Approve/Reject is only offered while a request is awaiting review.
    const isPending = status === 'pending';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 font-main">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative">

                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{t('review_modal.title')}</h3>
                        <p className="text-sm text-gray-500 mt-1">{t('review_modal.subtitle')}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                        <>
                            {/* Customer summary + current status */}
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    {user.image ? (
                                        <img src={user.image} alt={user.full_name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold">
                                            {(user.full_name || '?').charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-gray-800">{user.full_name || '-'}</p>
                                        <p className="text-sm text-gray-500" dir="ltr">{user.mobile_number || user.email || '-'}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLES[status] || STATUS_STYLES.unverified}`}>
                                    {t(`verification.${status}`, { defaultValue: status })}
                                </span>
                            </div>

                            {/* Detail grid */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-gray-100 pt-4">
                                <div>
                                    <span className="block text-gray-400">{t('review_modal.id_number')}</span>
                                    <span className="text-gray-800">{user.id_number || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-400">{t('review_modal.email')}</span>
                                    <span className="text-gray-800 break-all">{user.email || '-'}</span>
                                </div>
                            </div>

                            {/* Previous rejection reason, if any */}
                            {status === 'rejected' && user.rejection_reason && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                                    <span className="font-medium">{t('review_modal.previous_reason')}: </span>
                                    {user.rejection_reason}
                                </div>
                            )}

                            {/* Attached documents */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">{t('review_modal.documents')}</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <DocumentTile label={t('review_modal.id_front')} url={docs.id_front} t={t} />
                                    <DocumentTile label={t('review_modal.id_back')} url={docs.id_back} t={t} />
                                    <DocumentTile label={t('review_modal.selfie')} url={docs.selfie} t={t} />
                                </div>
                            </div>

                            {/* Rejection reason input (revealed only when rejecting) */}
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
                        </>
                    )}
                </div>

                {/* Footer actions — only while the request is pending review */}
                {!isLoading && !isError && isPending && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 rtl:flex-row-reverse justify-end">
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
