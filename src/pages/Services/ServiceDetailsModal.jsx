import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios.js';

const STATUS_STYLES = {
    Upcoming: 'bg-blue-50 text-blue-600 border-blue-200',
    inService: 'bg-amber-50 text-amber-600 border-amber-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
};

const TYPE_STYLES = {
    hourly: 'bg-blue-50 text-blue-600 border-blue-200',
    moqema: 'bg-purple-50 text-purple-600 border-purple-200',
    both: 'bg-teal-50 text-teal-600 border-teal-200',
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

export default function ServiceDetailsModal({ serviceId, onClose }) {
    const { t, i18n } = useTranslation('services');
    const isArabic = i18n.language?.startsWith('ar');
    const [activeTab, setActiveTab] = useState('profile'); // profile | bookings | reviews

    const { data, isLoading } = useQuery({
        queryKey: ['service-details', serviceId],
        queryFn: async () => (await axiosInstance.get(`/admin/services/${serviceId}/details`)).data.data,
        enabled: !!serviceId,
    });

    const service = data?.service;
    const stats = data?.stats;
    const bookings = data?.latest_bookings || [];
    const reviews = data?.reviews || [];

    const serviceName = service ? (isArabic ? (service.name_ar || service.name_en) : (service.name_en || service.name_ar)) : '';
    const categoryName = service?.category ? (isArabic ? service.category.name_ar : service.category.name_en) : '—';
    const description = service ? (isArabic ? service.description_ar : service.description_en) : '';

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
                        {t('details.title')} {service && <span className="text-base text-gray-500">— {serviceName}</span>}
                    </h3>
                    {service?.status && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${service.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {t(`status.${service.status}`)}
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
                            <div className="w-20 h-20 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                {service.image ? (
                                    <img src={service.image} alt={serviceName} className="w-full h-full object-cover" />
                                ) : (
                                    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1 text-center sm:text-start min-w-0">
                                <h2 className="text-2xl font-bold text-gray-800">{serviceName}</h2>
                                <div className="mt-1 flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                                    <span className="text-sm text-gray-500">{categoryName}</span>
                                    {service.type && (
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${TYPE_STYLES[service.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                            {t(`types.${service.type}`)}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-2 flex items-center gap-2 justify-center sm:justify-start">
                                    <StarRow value={service.avg_rating} />
                                    <span className="text-sm font-bold text-yellow-600">{Number(service.avg_rating || 0).toFixed(2)}</span>
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
                                {sideMenuItem('profile', t('details.tabs.profile'), 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')}
                                {sideMenuItem('bookings', t('details.tabs.bookings'), 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')}
                                {sideMenuItem('reviews', t('details.tabs.reviews'), 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z')}
                            </nav>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                {activeTab === 'profile' && (
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                            <h4 className="text-sm font-bold text-gray-700 mb-4">{t('details.info_title')}</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                    <span className="text-sm text-gray-500">{t('details.category')}</span>
                                                    <span className="text-sm font-medium text-gray-800">{categoryName}</span>
                                                </div>
                                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                    <span className="text-sm text-gray-500">{t('details.type')}</span>
                                                    <span className="text-sm font-medium text-gray-800">{t(`types.${service.type}`)}</span>
                                                </div>
                                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                    <span className="text-sm text-gray-500">{t('details.status')}</span>
                                                    <span className="text-sm font-medium text-gray-800">{t(`status.${service.status}`)}</span>
                                                </div>
                                            </div>
                                            {description && (
                                                <div className="mt-4">
                                                    <p className="text-sm text-gray-500 mb-1">{t('details.description')}</p>
                                                    <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                            <h4 className="text-sm font-bold text-gray-700 mb-4">{t('details.workers_title')}</h4>
                                            {service.workers?.length ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {service.workers.map((w) => (
                                                        <span key={w.id} className="px-3 py-1 rounded-full text-xs font-medium bg-[#FDF0F3] text-[#E91E63]">
                                                            {w.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-400">{t('details.workers_empty')}</p>
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
                                                            <th className="px-4 py-3">{t('details.col.date')}</th>
                                                            <th className="px-4 py-3 text-center">{t('details.col.status')}</th>
                                                            <th className="px-4 py-3 text-end">{t('details.col.amount')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {bookings.map((b) => (
                                                            <tr key={b.id} className="border-b border-gray-50 last:border-0">
                                                                <td className="px-4 py-3 font-medium text-gray-700">{b.booking_ref}</td>
                                                                <td className="px-4 py-3">{b.customer_name || '—'}</td>
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
                                                                <p className="text-xs text-gray-400">{r.created_since}{r.booking_ref ? ` · ${r.booking_ref}` : ''}</p>
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
        </div>
    );
}
