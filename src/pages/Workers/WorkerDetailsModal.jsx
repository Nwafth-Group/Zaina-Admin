import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios.js';
import BookingDetailsModal from '../Bookings/BookingDetailsModal';

const STATUS_STYLES = {
    Upcoming: 'bg-blue-50 text-blue-600 border-blue-200',
    inService: 'bg-amber-50 text-amber-600 border-amber-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
};

const StarRow = ({ value = 0 }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
            <svg key={i} className={`w-4 h-4 ${i <= Math.round(value) ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        ))}
    </div>
);

const StatCard = ({ label, value, accent = 'text-gray-800' }) => (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 text-center shadow-sm">
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
);

// Full name from a review's nested customer object.
const reviewerName = (r) => [r.customer?.first_name, r.customer?.last_name].filter(Boolean).join(' ') || '—';

export default function WorkerDetailsModal({ workerId, onClose }) {
    const { t, i18n } = useTranslation('workers');
    const isArabic = i18n.language?.startsWith('ar');
    const [activeTab, setActiveTab] = useState('profile'); // profile | bookings | reviews
    const [bookingDetailsId, setBookingDetailsId] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['worker-details', workerId],
        queryFn: async () => (await axiosInstance.get(`/admin/workers/${workerId}/details`)).data.data,
        enabled: !!workerId,
    });

    const worker = data; // Worker fields are at root of data
    const stats = data?.stats || { total_bookings: 0, completed_bookings: 0, reviews_count: 0 };
    const bookings = data?.latest_bookings || [];
    const reviews = data?.reviews || [];

    const serviceLabel = (service) =>
        isArabic ? (service.name_ar || service.name_en) : (service.name_en || service.name_ar);

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
                        {t('details.title')} {worker && <span className="text-base text-gray-500">— {worker.name}</span>}
                    </h3>
                    {worker?.status && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${
                            worker.status === 'active' 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : worker.status === 'suspended'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                            {worker.status === 'suspended' ? (isArabic ? 'موقوف' : 'Suspended') : t(`status.${worker.status}`)}
                        </span>
                    )}
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors" aria-label={t('details.close')}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
                {isLoading || !data ? (
                    <div className="flex justify-center items-center h-full">
                        <svg className="animate-spin h-8 w-8 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                    </div>
                ) : (
                    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6">

                        {/* Profile hero */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-center gap-5">
                            <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                {worker.image ? (
                                    <img src={worker.image} alt={worker.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-gray-400 font-bold text-3xl">{worker.name?.charAt(0)}</span>
                                )}
                            </div>
                            <div className="flex-1 text-center sm:text-start min-w-0">
                                <h2 className="text-2xl font-bold text-gray-800">{worker.name}</h2>
                                <p className="text-sm text-gray-500 mt-0.5">{worker.nationality}</p>
                                <div className="mt-2 flex items-center gap-2 justify-center sm:justify-start">
                                    <StarRow value={worker.rating} />
                                    <span className="text-sm font-bold text-yellow-600">{Number(worker.rating || 0).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
                                <StatCard label={t('details.stats.total_bookings')} value={stats.total_bookings} />
                                <StatCard label={t('details.stats.completed')} value={stats.completed_bookings} accent="text-green-600" />
                                <StatCard label={t('details.stats.reviews')} value={stats.reviews_count} accent="text-[#E91E63]" />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Side menu */}
                            <nav className="md:w-56 shrink-0 flex md:flex-col gap-1">
                                {sideMenuItem('profile', t('details.tabs.profile'), 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z')}
                                {sideMenuItem('bookings', t('details.tabs.bookings'), 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')}
                                {sideMenuItem('reviews', t('details.tabs.reviews'), 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z')}
                            </nav>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                {activeTab === 'profile' && (
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                            <h4 className="text-sm font-bold text-gray-700 mb-4">{t('details.info_title')}</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
                                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                    <span className="text-gray-500">{isArabic ? 'الجنسية' : 'Nationality'}</span>
                                                    <span className="font-semibold text-gray-800">{worker.nationality || '—'}</span>
                                                </div>
                                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                    <span className="text-gray-500">{isArabic ? 'الجنس' : 'Gender'}</span>
                                                    <span className="font-semibold text-gray-800 capitalize">{worker.gender || '—'}</span>
                                                </div>
                                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                    <span className="text-gray-500">{isArabic ? 'رقم الهاتف' : 'Phone Number'}</span>
                                                    <span className="font-semibold text-gray-800">{worker.phone_number || '—'}</span>
                                                </div>
                                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                    <span className="text-gray-500">{isArabic ? 'رقم الهوية' : 'ID Number'}</span>
                                                    <span className="font-semibold text-gray-800">{worker.id_number || '—'}</span>
                                                </div>
                                                <div className="flex justify-between py-1.5 border-b border-gray-50 sm:col-span-2">
                                                    <span className="text-gray-500">{isArabic ? 'العنوان' : 'Address'}</span>
                                                    <span className="font-semibold text-gray-805 whitespace-pre-line text-end">{worker.address || '—'}</span>
                                                </div>
                                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                    <span className="text-gray-500">{isArabic ? 'الحالة' : 'Status'}</span>
                                                    <span className="font-semibold text-gray-800">{worker.status === 'suspended' ? (isArabic ? 'موقوف' : 'Suspended') : t(`status.${worker.status}`)}</span>
                                                </div>
                                                <div className="flex justify-between py-1.5 border-b border-gray-50 sm:col-span-2">
                                                    <span className="text-gray-500">{isArabic ? 'الخدمة المعينة' : 'Assigned Service'}</span>
                                                    <span className="font-bold text-[#E91E63]">
                                                        {worker.assigned_service ? serviceLabel(worker.assigned_service) : (isArabic ? 'غير معين' : 'Unassigned')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                            <h4 className="text-sm font-bold text-gray-700 mb-4">{t('details.services_title')}</h4>
                                            {worker.services?.length ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {worker.services.map((s) => (
                                                        <span key={s.id} className="px-3 py-1 rounded-full text-xs font-medium bg-[#FDF0F3] text-[#E91E63]">
                                                            {serviceLabel(s)}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-400">{t('details.services_empty')}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'bookings' && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                        {bookings.length === 0 ? (
                                            <p className="text-sm text-gray-400 p-8 text-center">{t('details.bookings_empty')}</p>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left rtl:text-right text-gray-600 min-w-[640px]">
                                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                                                        <tr>
                                                            <th className="px-4 py-3">{t('details.col.ref')}</th>
                                                            <th className="px-4 py-3">{t('details.col.customer')}</th>
                                                            <th className="px-4 py-3">{t('details.col.service')}</th>
                                                            <th className="px-4 py-3">{t('details.col.date')}</th>
                                                            <th className="px-4 py-3 text-center">{t('details.col.status')}</th>
                                                            <th className="px-4 py-3 text-end">{t('details.col.amount')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {bookings.map((b) => (
                                                            <tr key={b.id} className="border-b border-gray-50 last:border-0">
                                                                <td className="px-4 py-3">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setBookingDetailsId(b.id)}
                                                                        className="font-mono text-xs font-bold text-[#E91E63] bg-[#FDF0F3] hover:bg-[#FAD2DC] px-2 py-1 rounded transition-colors"
                                                                    >
                                                                        {b.booking_ref}
                                                                    </button>
                                                                </td>
                                                                <td className="px-4 py-3">{b.customer_name || '—'}</td>
                                                                <td className="px-4 py-3">{b.service_name || '—'}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap">{b.booking_date || '—'}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${STATUS_STYLES[b.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                                        {t(`details.booking_status.${b.status}`, b.status)}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-end font-medium whitespace-nowrap">{b.total_amount} {b.currency}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'reviews' && (
                                    <div className="space-y-3">
                                        {reviews.length === 0 ? (
                                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                                                <p className="text-sm text-gray-400">{t('details.reviews_empty')}</p>
                                            </div>
                                        ) : (
                                            reviews.map((r) => (
                                                <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-9 h-9 rounded-full bg-[#FDF0F3] text-[#E91E63] flex items-center justify-center font-bold shrink-0">
                                                                {r.customer?.first_name?.charAt(0) || '?'}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-gray-800 truncate">{reviewerName(r)}</p>
                                                                <p className="text-xs text-gray-400">
                                                                    {r.created_since}
                                                                    {r.booking_ref && (
                                                                        <>
                                                                            {' · '}
                                                                            {r.booking_id ? (
                                                                                <button 
                                                                                    type="button"
                                                                                    onClick={() => setBookingDetailsId(r.booking_id)}
                                                                                    className="text-[#E91E63] hover:underline font-semibold"
                                                                                >
                                                                                    {r.booking_ref}
                                                                                </button>
                                                                            ) : (
                                                                                r.booking_ref
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <StarRow value={r.rating} />
                                                    </div>
                                                    {r.comment && <p className="text-sm text-gray-600 mt-3">{r.comment}</p>}
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

            {/* Clickable Booking Detail Viewer */}
            {bookingDetailsId && (
                <BookingDetailsModal bookingId={bookingDetailsId} onClose={() => setBookingDetailsId(null)} />
            )}
        </div>
    );
}
