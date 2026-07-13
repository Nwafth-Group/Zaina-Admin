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
    const isBabysitting = service?.service_code === 'BABYSITTER_HOURLY' || 
                          (service?.category?.name_en?.toLowerCase().includes('babysitting') || 
                           service?.category?.name_en?.toLowerCase().includes('nanny') || 
                           service?.category?.name_ar?.includes('أطفال') || 
                           service?.category?.name_en?.toLowerCase().includes('babysitter'));

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
                                         {/* 1. Basic & Pricing Info */}
                                         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                             <h4 className="text-sm font-bold text-gray-700 mb-4">{t('details.info_title')}</h4>
                                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                                                 <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                     <span className="text-sm text-gray-500">{t('form.service_code')}</span>
                                                     <span className="text-sm font-medium text-gray-800">{service.service_code || '—'}</span>
                                                 </div>
                                                 <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                     <span className="text-sm text-gray-500">{t('details.type')}</span>
                                                     <span className="text-sm font-medium text-gray-800">{t(`types.${service.type}`)}</span>
                                                 </div>
                                                 <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                     <span className="text-sm text-gray-500">{t('details.status')}</span>
                                                     <span className="text-sm font-medium text-gray-800">{t(`status.${service.status}`)}</span>
                                                 </div>
                                                 <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                     <span className="text-sm text-gray-500">{t('form.base_price')}</span>
                                                     <span className="text-sm font-bold text-gray-800">
                                                         {service.base_price} {service.price_details?.currency || 'EGP'}
                                                     </span>
                                                 </div>
                                                 <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                     <span className="text-sm text-gray-500">{t('form.start_time')} - {t('form.end_time')}</span>
                                                     <span className="text-sm font-medium text-gray-800">
                                                         {service.start_time ? service.start_time.slice(0, 5) : '—'} - {service.end_time ? service.end_time.slice(0, 5) : '—'}
                                                     </span>
                                                 </div>
                                                 <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                     <span className="text-sm text-gray-500">{t('form.default_duration')}</span>
                                                     <span className="text-sm font-medium text-gray-800">
                                                         {service.default_duration} {t(`form.${(service.duration_unit || 'Hours').toLowerCase()}`)}
                                                     </span>
                                                 </div>
                                                 {service.has_duration_range && (
                                                     <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                         <span className="text-sm text-gray-500">{t('form.min_duration')} - {t('form.max_duration')}</span>
                                                         <span className="text-sm font-medium text-gray-800">
                                                             {service.min_duration} - {service.max_duration} {t(`form.${(service.duration_unit || 'Hours').toLowerCase()}`)}
                                                         </span>
                                                     </div>
                                                 )}
                                                 <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                     <span className="text-sm text-gray-500">{t('form.min_workers')} - {t('form.max_workers')}</span>
                                                     <span className="text-sm font-medium text-gray-800">
                                                         {service.min_workers || 1} - {service.max_workers || 1}
                                                     </span>
                                                 </div>
                                                 {isBabysitting && (
                                                     <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                         <span className="text-sm text-gray-500">{isArabic ? 'الحد الأدنى - الأقصى للأطفال' : 'Min - Max Children'}</span>
                                                         <span className="text-sm font-medium text-gray-800">
                                                             {service.min_children || 1} - {service.max_children || 1}
                                                         </span>
                                                     </div>
                                                 )}
                                                  <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                      <span className="text-sm text-gray-50">{isArabic ? 'جنس العمالة المتاح' : 'Available Genders'}</span>
                                                      <span className="text-sm font-medium text-gray-800">
                                                          {service.worker_gender_options ? service.worker_gender_options.join(', ') : 'Female'}
                                                      </span>
                                                  </div>
                                                 {description && (
                                                     <div className="mt-4">
                                                         <p className="text-sm text-gray-500 mb-1">{t('details.description')}</p>
                                                         <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
                                                     </div>
                                                 )}
                                             </div>

                                             {isBabysitting && service.child_age_groups && service.child_age_groups.length > 0 && (
                                                 <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
                                                     <h4 className="text-sm font-bold text-gray-700 mb-4">{isArabic ? 'قواعد حساب جليسات الأطفال حسب الفئات العمرية' : 'Babysitter Age Group Calculation Rules'}</h4>
                                                     <div className="overflow-x-auto">
                                                         <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                                                             <thead className="text-xs text-gray-700 bg-gray-50 uppercase">
                                                                 <tr>
                                                                     <th className="px-4 py-2">{isArabic ? 'الفئة العمرية' : 'Age Group'}</th>
                                                                     <th className="px-4 py-2">{isArabic ? 'السن من (شهور)' : 'Age From (Months)'}</th>
                                                                     <th className="px-4 py-2">{isArabic ? 'السن إلى (شهور)' : 'Age To (Months)'}</th>
                                                                     <th className="px-4 py-2">{isArabic ? 'طريقة الحساب' : 'Calculation Rule'}</th>
                                                                     <th className="px-4 py-2 text-center">{isArabic ? 'حالة القاعدة' : 'Status'}</th>
                                                                     <th className="px-4 py-2 text-center">{isArabic ? 'جليسة لكل طفل/نسبة' : 'Babysitters Ratio'}</th>
                                                                 </tr>
                                                             </thead>
                                                             <tbody>
                                                                 {service.child_age_groups.map((group) => (
                                                                     <tr key={group.id} className="border-b border-gray-100">
                                                                         <td className="px-4 py-2 font-medium text-gray-800">
                                                                             {isArabic ? group.name_ar : group.name_en}
                                                                         </td>
                                                                         <td className="px-4 py-2">{group.age_from}</td>
                                                                         <td className="px-4 py-2">{group.age_to}</td>
                                                                         <td className="px-4 py-2">
                                                                             {group.calculation_type === 'per_child'
                                                                                 ? (isArabic ? 'لكل طفل' : 'Per Child')
                                                                                 : (isArabic ? 'نسبة وتناسب' : 'Ratio Based')}
                                                                         </td>
                                                                         <td className="px-4 py-2 text-center">
                                                                             <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                                                 group.status === 'active'
                                                                                 ? 'bg-green-100 text-green-700'
                                                                                 : 'bg-gray-100 text-gray-600'
                                                                             }`}>
                                                                                 {group.status}
                                                                             </span>
                                                                         </td>
                                                                         <td className="px-4 py-2 text-center font-medium">
                                                                             {group.calculation_type === 'per_child'
                                                                                 ? (isArabic ? `${group.required_worker_count} عامل(ة) لكل طفل` : `${group.required_worker_count} worker(s) per child`)
                                                                                 : (isArabic ? `${group.required_worker_count} عامل(ة) لكل ${group.children_count} أطفال` : `${group.required_worker_count} worker(s) for every ${group.children_count} children`)}
                                                                         </td>
                                                                     </tr>
                                                                 ))}
                                                             </tbody>
                                                         </table>
                                                     </div>
                                                 </div>
                                             )}
                                         </div>

                                         {service.duration && (
                                             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                                 <h4 className="text-sm font-bold text-gray-700 mb-4">{isArabic ? 'تفاصيل العقد والمدة' : 'Duration & Contract Details'}</h4>
                                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
                                                     {service.duration.service_period_hours && (
                                                         <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                             <span className="text-gray-500">{isArabic ? 'ساعات فترة الخدمة' : 'Service Period Hours'}</span>
                                                             <span className="font-semibold text-gray-800">{service.duration.service_period_hours} {isArabic ? 'ساعة' : 'Hours'}</span>
                                                         </div>
                                                     )}
                                                     {service.duration.min_contract_months && (
                                                         <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                             <span className="text-gray-500">{isArabic ? 'الحد الأدنى لشهور العقد' : 'Min Contract Months'}</span>
                                                             <span className="font-semibold text-gray-800">{service.duration.min_contract_months} {isArabic ? 'شهر' : 'Months'}</span>
                                                         </div>
                                                     )}
                                                     {service.duration.allowed_contract_durations && service.duration.allowed_contract_durations.length > 0 && (
                                                         <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                             <span className="text-gray-500">{isArabic ? 'مدد العقد المسموحة' : 'Allowed Contract Durations'}</span>
                                                             <span className="font-semibold text-gray-800">{service.duration.allowed_contract_durations.join(', ')}</span>
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>
                                         )}

                                         {/* 2. Geographic Coverage Locations */}
                                         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                             <h4 className="text-sm font-bold text-gray-700 mb-4">{t('form.coverages')}</h4>
                                             {service.coverages?.length ? (
                                                 <div className="overflow-x-auto">
                                                     <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                                                         <thead className="text-xs text-gray-700 bg-gray-50 uppercase">
                                                             <tr>
                                                                 <th className="px-4 py-2">{t('form.city')}</th>
                                                                 <th className="px-4 py-2">{t('form.area')}</th>
                                                                 <th className="px-4 py-2 text-center">{t('form.status')}</th>
                                                             </tr>
                                                         </thead>
                                                         <tbody>
                                                             {service.coverages.map((cov) => (
                                                                 <tr key={cov.id} className="border-b border-gray-100">
                                                                     <td className="px-4 py-2 font-medium text-gray-800">
                                                                         {isArabic ? cov.city?.name_ar : cov.city?.name_en}
                                                                     </td>
                                                                     <td className="px-4 py-2">
                                                                         {cov.area?.name_ar || cov.area?.name_en ? (
                                                                             isArabic ? cov.area.name_ar : cov.area.name_en
                                                                         ) : (
                                                                             <span className="text-gray-400 text-xs italic">{isArabic ? 'كل المدينة' : 'Whole city'}</span>
                                                                         )}
                                                                     </td>
                                                                     <td className="px-4 py-2 text-center">
                                                                         <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                                             cov.status === 'active' 
                                                                             ? 'bg-green-100 text-green-700' 
                                                                             : cov.status === 'coming_soon'
                                                                             ? 'bg-amber-100 text-amber-700'
                                                                             : 'bg-gray-100 text-gray-600'
                                                                         }`}>
                                                                             {cov.status || 'active'}
                                                                         </span>
                                                                     </td>
                                                                 </tr>
                                                             ))}
                                                         </tbody>
                                                     </table>
                                                 </div>
                                             ) : (
                                                 <p className="text-sm text-gray-400">{isArabic ? 'لا توجد تغطية جغرافية محددة.' : 'No coverages specified.'}</p>
                                             )}
                                         </div>

                                         {/* 3. Visit Types & Options */}
                                         {service.available_visit_types && service.available_visit_types.length > 0 && (
                                             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                                 <h4 className="text-sm font-bold text-gray-700 mb-4">{t('form.visit_types')}</h4>
                                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                     {service.available_visit_types.map((vt, i) => (
                                                         <div key={i} className="flex justify-between items-center bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-100">
                                                             <span className="text-sm font-medium text-gray-700">{t(`form.${vt.type}`)}</span>
                                                             {vt.discount != null && Number(vt.discount) > 0 && (
                                                                 <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                                                     {t('form.discount_pct')}: {vt.discount}%
                                                                 </span>
                                                             )}
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                         )}

                                         

                                          {/* Babysitter Age Groups Configuration */}
                                          {isBabysitting && service.child_age_groups && service.child_age_groups.length > 0 && (
                                              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                                  <h4 className="text-sm font-bold text-gray-700 mb-4">{isArabic ? 'قواعد احتساب جليسة الأطفال والفئات العمرية' : 'Child Age Groups & Babysitter Calculation Rules'}</h4>
                                                  <div className="overflow-x-auto">
                                                      <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                                                          <thead className="text-xs text-gray-700 bg-gray-50 uppercase">
                                                              <tr>
                                                                  <th className="px-4 py-2">{isArabic ? 'اسم الفئة العمرية' : 'Age Group Name'}</th>
                                                                  <th className="px-4 py-2">{isArabic ? 'النطاق العمري (بالأشهر)' : 'Age Range (Months)'}</th>
                                                                  <th className="px-4 py-2">{isArabic ? 'طريقة الاحتساب' : 'Calculation Rule'}</th>
                                                                  <th className="px-4 py-2 text-center">{isArabic ? 'عدد المربيات المطلوب' : 'Req. Babysitters'}</th>
                                                                  <th className="px-4 py-2 text-center">{isArabic ? 'الحالة' : 'Status'}</th>
                                                              </tr>
                                                          </thead>
                                                          <tbody>
                                                              {service.child_age_groups.map((group) => (
                                                                  <tr key={group.id} className="border-b border-gray-100">
                                                                      <td className="px-4 py-2 font-medium text-gray-800">
                                                                          {isArabic ? group.name_ar : group.name_en}
                                                                      </td>
                                                                      <td className="px-4 py-2 text-gray-600">
                                                                          {group.age_from} - {group.age_to} {isArabic ? 'أشهر' : 'Months'}
                                                                      </td>
                                                                      <td className="px-4 py-2 text-gray-600">
                                                                          {group.calculation_type === 'per_child'
                                                                              ? (isArabic ? 'مربيات لكل طفل' : 'Per Child')
                                                                              : (isArabic ? `مربيات لكل ${group.children_count} أطفال` : `${group.required_worker_count} Babysitter per ${group.children_count} Children`)}
                                                                      </td>
                                                                      <td className="px-4 py-2 text-center font-bold text-gray-800">
                                                                          {group.required_worker_count}
                                                                      </td>
                                                                      <td className="px-4 py-2 text-center">
                                                                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                                              group.status === 'active'
                                                                              ? 'bg-green-100 text-green-700'
                                                                              : 'bg-gray-100 text-gray-600'
                                                                          }`}>
                                                                              {group.status === 'active' ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                                                                          </span>
                                                                      </td>
                                                                  </tr>
                                                              ))}
                                                          </tbody>
                                                      </table>
                                                  </div>
                                              </div>
                                          )}{/* 4. Weekly Working Days & Shifts */}
                                          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                                              <div>
                                                  <h4 className="text-sm font-bold text-gray-700 mb-3">{t('form.working_days')}</h4>
                                                  {service.available_days && service.available_days.length > 0 ? (
                                                      <div className="flex flex-wrap gap-2">
                                                          {service.available_days.map((day, i) => (
                                                              <span key={i} className="text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200 px-3 py-1 rounded-full shadow-sm capitalize">
                                                                  {t(`days.${day}`, day)}
                                                              </span>
                                                          ))}
                                                      </div>
                                                  ) : (
                                                      <p className="text-sm text-gray-400">{isArabic ? 'لا توجد أيام عمل محددة.' : 'No working days specified.'}</p>
                                                  )}
                                              </div>
                                              <div className="pt-2">
                                                  <h4 className="text-sm font-bold text-gray-700 mb-3">{t('form.shifts')}</h4>
                                                  {service.available_shifts && service.available_shifts.length > 0 ? (
                                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                          {service.available_shifts.map((sch, i) => (
                                                              <div key={i} className="flex justify-between items-center bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-100 font-mono text-xs">
                                                                  <span className="font-semibold text-gray-700">{isArabic ? 'شفت ' + (i + 1) : 'Shift ' + (i + 1)}</span>
                                                                  <span className="font-bold text-[#E91E63] bg-white px-2.5 py-1 rounded border border-gray-200 shadow-sm">
                                                                      {sch.start_time} - {sch.end_time}
                                                                  </span>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  ) : (
                                                      <p className="text-sm text-gray-400">{isArabic ? 'لا توجد شفتات عمل محددة.' : 'No shifts specified.'}</p>
                                                  )}
                                              </div>
                                          </div>

                                         {/* 5. Features Section */}
                                         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                             <h4 className="text-sm font-bold text-gray-700 mb-4">{t('form.section_features')}</h4>
                                             {service.features?.length ? (
                                                 <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-600">
                                                     {service.features.map((f, i) => (
                                                         <li key={i}>{isArabic ? f.ar : f.en}</li>
                                                     ))}
                                                 </ul>
                                             ) : (
                                                 <p className="text-sm text-gray-400">{t('form.no_features')}</p>
                                             )}
                                         </div>

                                         {/* 6. Booking Policies & Business Rules */}
                                         {service.rules && (
                                             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                                 <h4 className="text-sm font-bold text-gray-700 mb-4">{t('form.section_rules')}</h4>
                                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
                                                     <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                         <span className="text-gray-500">{t('form.allow_cancel')}</span>
                                                         <span className={`font-semibold ${service.rules.allow_cancel ? 'text-green-600' : 'text-gray-400'}`}>
                                                             {service.rules.allow_cancel ? (isArabic ? 'نعم' : 'Yes') : (isArabic ? 'لا' : 'No')}
                                                         </span>
                                                     </div>
                                                     {service.rules.allow_cancel && (
                                                         <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                             <span className="text-gray-500">{t('form.free_cancel')}</span>
                                                             <span className="font-semibold text-gray-800">{service.rules.free_cancel_cutoff_hours} {isArabic ? 'ساعة' : 'hours'}</span>
                                                         </div>
                                                     )}
                                                     <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                         <span className="text-gray-500">{t('form.allow_reschedule')}</span>
                                                         <span className={`font-semibold ${service.rules.allow_reschedule ? 'text-green-600' : 'text-gray-400'}`}>
                                                             {service.rules.allow_reschedule ? (isArabic ? 'نعم' : 'Yes') : (isArabic ? 'لا' : 'No')}
                                                         </span>
                                                     </div>
                                                     {service.rules.allow_reschedule && (
                                                         <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                             <span className="text-gray-500">{t('form.reschedule_cutoff')}</span>
                                                             <span className="font-semibold text-gray-800">{service.rules.reschedule_cutoff_hours} {isArabic ? 'ساعة' : 'hours'}</span>
                                                         </div>
                                                     )}
                                                     <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                         <span className="text-gray-500">{t('form.allow_same_day')}</span>
                                                         <span className={`font-semibold ${service.rules.allow_same_day ? 'text-green-600' : 'text-gray-400'}`}>
                                                             {service.rules.allow_same_day ? (isArabic ? 'نعم' : 'Yes') : (isArabic ? 'لا' : 'No')}
                                                         </span>
                                                     </div>
                                                     <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                         <span className="text-gray-500">{t('form.max_advance_booking_days')}</span>
                                                         <span className="font-semibold text-gray-800">{service.rules.max_advance_booking_days || 0} {isArabic ? 'يوم' : 'days'}</span>
                                                     </div>
                                                     <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                         <span className="text-gray-500">{t('form.arrival_buffer')}</span>
                                                         <span className="font-semibold text-gray-800">{service.rules.arrival_buffer_minutes ?? 0} {isArabic ? 'دقيقة' : 'minutes'}</span>
                                                     </div>
                                                     <div className="flex justify-between py-1.5 border-b border-gray-50">
                                                         <span className="text-gray-500">{t('form.grace_period')}</span>
                                                         <span className="font-semibold text-gray-800">{service.rules.late_arrival_grace_minutes ?? 0} {isArabic ? 'دقيقة' : 'minutes'}</span>
                                                     </div>
                                                 </div>
                                             </div>
                                         )}

                                         {/* 7. Terms & Conditions display */}
                                         {(service.terms_ar || service.terms_en) && (
                                             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                                 <h4 className="text-sm font-bold text-gray-700 mb-4">{isArabic ? 'الشروط والأحكام' : 'Terms & Conditions'}</h4>
                                                 <div className="space-y-4">
                                                     {service.terms_ar && (
                                                         <div dir="rtl" className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                             <p className="text-xs text-gray-400 font-semibold mb-1">الشروط (بالعربية):</p>
                                                             <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{service.terms_ar}</p>
                                                         </div>
                                                     )}
                                                     {service.terms_en && (
                                                         <div dir="ltr" className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                             <p className="text-xs text-gray-400 font-semibold mb-1">Terms (English):</p>
                                                             <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{service.terms_en}</p>
                                                         </div>
                                                     )}
                                                     <div className="flex justify-between py-1 border-t border-gray-100 pt-3">
                                                         <span className="text-sm text-gray-500">{t('form.acceptance_required')}</span>
                                                         <span className={`text-sm font-semibold ${service.acceptance_required ? 'text-green-600' : 'text-gray-400'}`}>
                                                             {service.acceptance_required ? (isArabic ? 'نعم' : 'Yes') : (isArabic ? 'لا' : 'No')}
                                                         </span>
                                                     </div>
                                                 </div>
                                             </div>
                                         )}

                                          {/* Available Dates */}
                                          {service.available_dates && service.available_dates.length > 0 && (
                                              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                                  <h4 className="text-sm font-bold text-gray-700 mb-4">{isArabic ? 'التواريخ المتاحة للحجز' : 'Available Booking Dates'}</h4>
                                                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                                                      {service.available_dates.map((dt, i) => (
                                                          <span key={i} className="text-xs bg-gray-50 text-gray-700 border border-gray-200 px-2.5 py-1 rounded shadow-sm">
                                                              {dt.substring(0, 10)}
                                                          </span>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}

                                         {/* 8. Assigned Workers */}
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
