import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios.js';

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

const reviewerName = (r) => [r.customer?.first_name, r.customer?.last_name].filter(Boolean).join(' ') || '—';

export default function WorkerDetails() {
    const { id: workerId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('workers');
    const isArabic = i18n.language?.startsWith('ar');
    const [activeTab, setActiveTab] = useState('profile'); // profile | bookings | reviews

    const { data, isLoading, isError } = useQuery({
        queryKey: ['worker-details', workerId],
        queryFn: async () => (await axiosInstance.get(`/admin/workers/${workerId}/details`)).data.data,
        enabled: !!workerId,
    });

    const worker = data?.worker;
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
                        onClick={() => navigate('/workers')} 
                        className="flex items-center gap-1 text-gray-500 hover:text-[#E91E63] transition-colors text-xs font-bold mb-2 outline-none"
                    >
                        {isArabic ? '← العودة لقائمة العاملين' : '← Back to Workers'}
                    </button>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                        {isArabic ? 'تفاصيل ملف العامل' : 'Worker Profile Details'}
                    </h2>
                </div>
            </div>

            {isLoading ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center text-gray-500">
                    <svg className="animate-spin h-8 w-8 text-[#E91E63] mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isArabic ? 'جاري تحميل تفاصيل العامل...' : 'Loading worker details...'}
                </div>
            ) : isError || !data ? (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center text-red-500 font-bold">
                    {isArabic ? 'خطأ في تحميل تفاصيل العامل.' : 'Error loading worker details.'}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Profile hero */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                            {worker.image ? (
                                <img src={worker.image} alt={worker.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-gray-400 font-bold text-3xl">{worker.name?.charAt(0)}</span>
                            )}
                        </div>
                        <div className="flex-1 text-center md:text-start min-w-0">
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                                <h3 className="text-2xl font-bold text-gray-800">{worker.name}</h3>
                                {worker.status && (
                                    <span className={`inline-block mx-auto md:mx-0 px-3 py-1 rounded-full text-xs font-bold border w-max whitespace-nowrap ${
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
                            <p className="text-sm text-gray-500 mt-1">{worker.nationality}</p>
                            <div className="mt-2 flex items-center gap-2 justify-center md:justify-start">
                                <StarRow value={worker.rating} />
                                <span className="text-sm font-bold text-yellow-600">{Number(worker.rating || 0).toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                            <StatCard label={t('details.stats.total_bookings')} value={stats.total_bookings} />
                            <StatCard label={t('details.stats.completed')} value={stats.completed_bookings} accent="text-green-600" />
                            <StatCard label={t('details.stats.reviews')} value={stats.reviews_count} accent="text-[#E91E63]" />
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        {/* Side menu navigation tabs */}
                        <div className="w-full lg:w-56 bg-white border border-gray-100 rounded-3xl p-4 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto">
                            {sideMenuItem('profile', t('details.tabs.profile'), 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z')}
                            {sideMenuItem('bookings', t('details.tabs.bookings'), 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')}
                            {sideMenuItem('reviews', t('details.tabs.reviews'), 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z')}
                        </div>

                        {/* Content area */}
                        <div className="flex-1 w-full min-w-0 space-y-6">
                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                        <h4 className="text-sm font-bold text-gray-700 mb-4">{t('details.info_title')}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                                            <div className="flex justify-between py-2 border-b border-gray-50">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'الجنسية' : 'Nationality'}</span>
                                                <span className="font-semibold text-gray-800">{worker.nationality || '—'}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-gray-50">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'الجنس' : 'Gender'}</span>
                                                <span className="font-semibold text-gray-800 capitalize">{worker.gender || '—'}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-gray-50">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'رقم الهاتف' : 'Phone Number'}</span>
                                                <span className="font-semibold text-gray-800" dir="ltr">{worker.phone_number || '—'}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-gray-50">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'رقم الهوية' : 'ID Number'}</span>
                                                <span className="font-semibold text-gray-800">{worker.id_number || '—'}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-gray-50">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'الحالة' : 'Status'}</span>
                                                <span className="font-semibold text-gray-800">{worker.status === 'suspended' ? (isArabic ? 'موقوف' : 'Suspended') : t(`status.${worker.status}`)}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-gray-50 sm:col-span-2">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'الخدمة المعينة' : 'Assigned Service'}</span>
                                                <span className="font-bold text-[#E91E63]">
                                                    {worker.assigned_service ? serviceLabel(worker.assigned_service) : (isArabic ? 'غير معين' : 'Unassigned')}
                                                </span>
                                            </div>
                                            <div className="flex flex-col sm:flex-row justify-between py-2 border-b border-gray-50 sm:col-span-2 gap-1">
                                                <span className="text-gray-400 font-medium">{isArabic ? 'العنوان' : 'Address'}</span>
                                                <span className="font-semibold text-gray-800 sm:text-end whitespace-pre-line leading-relaxed">{worker.address || '—'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                                        <h4 className="text-sm font-bold text-gray-700 mb-4">{t('details.services_title')}</h4>
                                        {worker.services?.length ? (
                                            <div className="flex flex-wrap gap-2">
                                                {worker.services.map((s) => (
                                                    <span key={s.id} className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#FDF0F3] text-[#E91E63] border border-[#FAD2DC]/30">
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
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                    {bookings.length === 0 ? (
                                        <p className="text-sm text-gray-400 p-12 text-center">{t('details.bookings_empty')}</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left rtl:text-right text-gray-600 min-w-[640px]">
                                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-bold">
                                                    <tr>
                                                        <th className="p-4">{t('details.col.ref')}</th>
                                                        <th className="p-4">{t('details.col.customer')}</th>
                                                        <th className="p-4">{t('details.col.service')}</th>
                                                        <th className="p-4">{t('details.col.date')}</th>
                                                        <th className="p-4 text-center">{t('details.col.status')}</th>
                                                        <th className="p-4 text-end">{t('details.col.amount')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {bookings.map((b) => (
                                                        <tr key={b.id} className="hover:bg-gray-50/50 transition-colors bg-white">
                                                            <td className="p-4">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => navigate(`/bookings/${b.id}`)}
                                                                    className="font-mono font-bold text-[#E91E63] hover:underline focus:outline-none"
                                                                >
                                                                    {b.booking_ref}
                                                                </button>
                                                            </td>
                                                            <td className="p-4 font-medium text-gray-800">{b.customer_name || '—'}</td>
                                                            <td className="p-4 text-gray-700">{b.service_name || '—'}</td>
                                                            <td className="p-4 whitespace-nowrap text-gray-500">{b.booking_date || '—'}</td>
                                                            <td className="p-4 text-center">
                                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${STATUS_STYLES[b.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                                    {t(`details.booking_status.${b.status}`, b.status)}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-end font-bold text-gray-800 whitespace-nowrap">{b.total_amount} {b.currency}</td>
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
                                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
                                            <p className="text-sm text-gray-400">{t('details.reviews_empty')}</p>
                                        </div>
                                    ) : (
                                        reviews.map((r) => (
                                            <div key={r.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-full bg-[#FDF0F3] text-[#E91E63] flex items-center justify-center font-bold shrink-0 text-sm">
                                                            {r.customer?.first_name?.charAt(0) || '?'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-gray-800 truncate">{reviewerName(r)}</p>
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                {r.created_since}
                                                                {r.booking_ref && (
                                                                    <>
                                                                        {' · '}
                                                                        {r.booking_id ? (
                                                                            <button 
                                                                                type="button"
                                                                                onClick={() => navigate(`/bookings/${r.booking_id}`)}
                                                                                className="text-[#E91E63] hover:underline font-bold"
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
                                                {r.comment && <p className="text-sm text-gray-600 mt-4 leading-relaxed bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">{r.comment}</p>}
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
