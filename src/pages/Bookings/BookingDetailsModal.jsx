import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { FormSection, SelectField } from '../../components/form/FormKit';

const STATUS_STYLES = {
    Upcoming: 'bg-blue-50 text-blue-600 border-blue-200',
    inService: 'bg-amber-50 text-amber-600 border-amber-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
};

const PAYMENT_STYLES = {
    paid: 'bg-green-100 text-green-700',
    unpaid: 'bg-gray-100 text-gray-600',
    refunded: 'bg-purple-100 text-purple-700',
};

const Row = ({ label, value }) => (
    <div className="flex justify-between gap-4 py-1.5">
        <span className="text-sm text-gray-500 shrink-0">{label}</span>
        <span className="text-sm font-medium text-gray-800 text-end">{value ?? '—'}</span>
    </div>
);

export default function BookingDetailsModal({ bookingId, onClose }) {
    const { t } = useTranslation('bookings');
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('details'); // side-menu: 'details' | 'history'
    const [moreOpen, setMoreOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelNote, setCancelNote] = useState('');

    const { data: booking, isLoading } = useQuery({
        queryKey: ['bookingDetail', bookingId],
        queryFn: async () => (await axiosInstance.get(`/admin/bookings/${bookingId}`)).data.data,
        enabled: !!bookingId,
    });

    const statusMutation = useMutation({
        mutationFn: (payload) => axiosInstance.patch(`/admin/bookings/${bookingId}/status`, payload),
        onSuccess: (response) => {
            toast.success(response.data?.message || 'تم تحديث حالة الحجز بنجاح');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['bookingDetail', bookingId] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء تحديث الحالة.');
        },
    });

    const changeStatus = (status, note) => statusMutation.mutate({ status, ...(note ? { note } : {}) });

    const status = booking?.status;
    const isWorkingStatus = status === 'Upcoming' || status === 'inService';
    // A completed/cancelled booking is final — no status changes are offered.
    const isTerminal = status === 'completed' || status === 'cancelled';
    const busy = statusMutation.isPending;

    const confirmCancel = () => {
        changeStatus('cancelled', cancelNote.trim());
        setCancelOpen(false);
        setCancelNote('');
    };

    const sideMenuItem = (key, label, iconPath) => {
        const active = activeTab === key;
        return (
            <button
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-start ${active ? 'bg-[#FDF0F3] text-[#E91E63]' : 'text-gray-600 hover:bg-gray-50'}`}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                </svg>
                {label}
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-col font-main">

            {/* Header */}
            <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 bg-white border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                    <h3 className="text-xl font-bold text-gray-800 truncate">
                        {t('details.title')} {booking && <span className="font-mono text-base text-gray-500">{booking.booking_ref}</span>}
                    </h3>
                    {status && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${STATUS_STYLES[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {t(`status.${status}`, status)}
                        </span>
                    )}
                    {booking?.payment_status && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${PAYMENT_STYLES[booking.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                            {t(`payment.${booking.payment_status}`, booking.payment_status)}
                        </span>
                    )}
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors" aria-label={t('details.close')}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Action bar — only once the booking has loaded and is still active
                (no inputs shown while data is still loading, none once final). */}
            {booking && !isTerminal && (
                <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-3">
                    <div className="w-full max-w-4xl mx-auto flex flex-wrap items-center gap-3">
                        {/* Status dropdown: Upcoming / In service */}
                        <div className="min-w-[160px]">
                            <SelectField
                                registration={{
                                    value: isWorkingStatus ? status : '',
                                    onChange: (e) => e.target.value && changeStatus(e.target.value),
                                }}
                                disabled={busy}
                            >
                                {!isWorkingStatus && <option value="" disabled>—</option>}
                                <option value="Upcoming">{t('status.Upcoming')}</option>
                                <option value="inService">{t('status.inService')}</option>
                            </SelectField>
                        </div>

                        {/* Mark as completed */}
                        <button
                            type="button"
                            onClick={() => changeStatus('completed')}
                            disabled={busy}
                            className="px-4 py-2.5 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
                        >
                            {t('details.mark_completed')}
                        </button>

                        {/* More menu: cancel */}
                        <div className="relative ms-auto">
                            <button
                                type="button"
                                onClick={() => setMoreOpen((o) => !o)}
                                aria-label={t('details.more')}
                                className="inline-flex items-center justify-center border border-gray-200 rounded-lg p-2.5 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                            {moreOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                                    <div className="absolute end-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                                        <button
                                            type="button"
                                            onClick={() => { setCancelOpen(true); setMoreOpen(false); }}
                                            className="w-full text-start px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {t('details.cancel_booking')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Body — side menu (details / history) + content panel */}
            <div className="flex-1 overflow-y-auto">
                {isLoading || !booking ? (
                    <div className="flex justify-center items-center h-full">
                        <svg className="animate-spin h-8 w-8 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                    </div>
                ) : (
                    <div className="w-full max-w-4xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">

                        {/* Side menu */}
                        <nav className="md:w-56 shrink-0 flex md:flex-col gap-1">
                            {sideMenuItem('details', t('menu.details'), 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z')}
                            {sideMenuItem('history', t('menu.history'), 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z')}
                        </nav>

                        {/* Content panel */}
                        <div className="flex-1 min-w-0 space-y-6">
                            {activeTab === 'details' ? (
                                <>
                                    <FormSection icon="user" title={t('details.customer')}>
                                        <Row label={t('details.name')} value={booking.customer?.name} />
                                        <Row label={t('details.phone')} value={booking.customer?.phone} />
                                        <Row label={t('details.email')} value={booking.customer?.email} />
                                    </FormSection>

                                    <FormSection icon="sparkles" title={t('details.service')}>
                                        <Row label={t('details.service_name')} value={booking.service_name} />
                                        <Row label={t('details.date')} value={booking.booking_date} />
                                        <Row label={t('details.time')} value={booking.time_slot} />
                                        <Row label={t('details.workers')} value={booking.workers?.length ? booking.workers.map((w) => w.name).join(', ') : '—'} />
                                    </FormSection>

                                    {booking.address && (
                                        <FormSection icon="location" title={t('details.address')}>
                                            <Row label={t('details.label')} value={booking.address.label} />
                                            <Row label={t('details.address_line')} value={booking.address.line} />
                                            <Row label={t('details.phone')} value={booking.address.phone} />
                                        </FormSection>
                                    )}

                                    <FormSection icon="info" title={t('details.price')}>
                                        <Row label={t('details.subtotal')} value={`${booking.price_summary?.subtotal} ${booking.price_summary?.currency}`} />
                                        <Row label={t('details.tax')} value={`${booking.price_summary?.tax} ${booking.price_summary?.currency}`} />
                                        <Row label={t('details.discount')} value={`${booking.price_summary?.discount} ${booking.price_summary?.currency}`} />
                                        <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between items-center">
                                            <span className="text-sm font-semibold text-gray-700">{t('details.total')}</span>
                                            <span className="text-base font-bold text-[#E91E63]">{booking.price_summary?.total} {booking.price_summary?.currency}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-sm text-gray-500">{t('table.payment')}</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${PAYMENT_STYLES[booking.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                                                {t(`payment.${booking.payment_status}`, booking.payment_status)}
                                            </span>
                                        </div>
                                    </FormSection>

                                    {booking.customer_notes && (
                                        <FormSection icon="info" title={t('details.notes')}>
                                            <p className="text-sm text-gray-600">{booking.customer_notes}</p>
                                        </FormSection>
                                    )}
                                </>
                            ) : (
                                <FormSection icon="clock" title={t('details.activity_title')}>
                                    {(booking.activity || []).length === 0 ? (
                                        <p className="text-sm text-gray-400">{t('details.no_activity')}</p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {booking.activity.map((a) => (
                                                <li key={a.id} className="flex gap-3">
                                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#E91E63]" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-gray-700">
                                                            <span className="font-medium">{a.old_status ? t(`status.${a.old_status}`, a.old_status) : '—'}</span>
                                                            {' → '}
                                                            <span className="font-medium">{t(`status.${a.new_status}`, a.new_status)}</span>
                                                        </p>
                                                        {a.note && <p className="text-xs text-gray-500 mt-0.5">{a.note}</p>}
                                                        <p className="text-xs text-gray-400 mt-0.5">{a.at} · {a.by || t('details.system')}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </FormSection>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Cancel confirmation */}
            {cancelOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setCancelOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h4 className="text-lg font-bold text-gray-800 mb-2">{t('details.cancel_booking')}</h4>
                        <p className="text-sm text-gray-500 mb-4">{t('details.confirm_cancel')}</p>
                        <textarea
                            value={cancelNote}
                            onChange={(e) => setCancelNote(e.target.value)}
                            rows="3"
                            placeholder={t('details.cancel_reason')}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#E91E63] transition-colors mb-4"
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setCancelOpen(false)} className="px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                                {t('details.keep')}
                            </button>
                            <button onClick={confirmCancel} disabled={busy} className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50">
                                {t('details.confirm_cancel_btn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
