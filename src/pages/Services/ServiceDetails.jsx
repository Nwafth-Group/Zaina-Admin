import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { hasPermission } from '../../utils/permissions.js';

const STATUS_STYLES = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    inactive: 'bg-gray-100 text-gray-600 border-gray-200/80',
};

const TYPE_STYLES = {
    hourly: 'bg-blue-50 text-blue-700 border-blue-200/80',
    moqema: 'bg-purple-50 text-purple-700 border-purple-200/80',
    both: 'bg-teal-50 text-teal-700 border-teal-200/80',
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

const InfoItem = ({ icon, label, value, highlight = false }) => (
    <div className="flex items-start gap-3 p-3.5 bg-gray-50/60 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-colors">
        {icon && (
            <div className="w-8 h-8 rounded-xl bg-white border border-gray-200/60 flex items-center justify-center text-gray-500 shrink-0 shadow-2xs">
                {icon}
            </div>
        )}
        <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className={`text-sm ${highlight ? 'font-extrabold text-gray-900' : 'font-bold text-gray-700'} truncate`}>
                {value ?? '—'}
            </p>
        </div>
    </div>
);

export default function ServiceDetails() {
    const { id: serviceId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('services');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState('profile'); // profile | bookings | reviews

    const { data: responseData, isLoading, isError, refetch } = useQuery({
        queryKey: ['service-details', serviceId],
        queryFn: async () => (await axiosInstance.get(`/admin/services/${serviceId}/details`)).data.data,
        enabled: !!serviceId,
    });

    const toggleMutation = useMutation({
        mutationFn: async () => axiosInstance.post(`/admin/services/${serviceId}/toggle-status`),
        onSuccess: (res) => {
            toast.success(res.data?.message || (isArabic ? 'تم تغيير حالة الخدمة بنجاح' : 'Service status updated successfully'));
            queryClient.invalidateQueries({ queryKey: ['service-details'] });
            queryClient.invalidateQueries({ queryKey: ['service-details', serviceId] });
            queryClient.invalidateQueries({ queryKey: ['services'] });
            refetch();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'حدث خطأ أثناء تغيير الحالة' : 'Failed to update status'));
        },
    });

    const service = responseData?.service;
    const stats = responseData?.stats || {};
    const bookings = responseData?.latest_bookings || [];
    const reviews = responseData?.reviews || [];

    const serviceName = service ? (isArabic ? (service.name_ar || service.name_en) : (service.name_en || service.name_ar)) : '';
    const categoryName = service?.category ? (isArabic ? service.category.name_ar : service.category.name_en) : '—';
    const description = service ? (isArabic ? service.description_ar : service.description_en) : '';

    const isBabysitting = service?.service_code === 'BABYSITTER_HOURLY' || 
                          (service?.category?.name_en?.toLowerCase().includes('babysitting') || 
                           service?.category?.name_en?.toLowerCase().includes('nanny') || 
                           service?.category?.name_ar?.includes('أطفال') || 
                           service?.category?.name_en?.toLowerCase().includes('babysitter'));

    const hasOptions = !!(service?.options && service.options.length > 0);
    const isDeepCleaning = service?.service_code === 'DEEP_CLEANING';

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
        <div className="space-y-6 font-main w-full pb-12">
            {/* Top Header & Breadcrumbs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
                <div>
                    <button
                        onClick={() => navigate('/services')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E91E63] transition-colors mb-1.5 outline-none group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>{isArabic ? 'العودة لقائمة الخدمات' : 'Back to Services'}</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                            {serviceName || (isArabic ? 'تفاصيل الخدمة' : 'Service Details')}
                        </h2>
                        {service?.service_code && (
                            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-pink-50 text-[#E91E63] border border-pink-100">
                                {service.service_code}
                            </span>
                        )}
                    </div>
                </div>

                {/* Primary Action Buttons Bar */}
                {service && (
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        {hasPermission('services.edit') && (
                            <button
                                type="button"
                                onClick={() => navigate(`/services/${service.id}/edit`)}
                                className="bg-[#E91E63] hover:bg-[#d81b60] text-white px-4 h-10 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-2 outline-none"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                                <span>{isArabic ? 'تعديل الخدمة' : 'Edit Service'}</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => toggleMutation.mutate()}
                            disabled={toggleMutation.isPending}
                            className={`px-4 h-10 rounded-xl text-xs font-bold border active:scale-95 transition-all flex items-center gap-2 outline-none ${
                                service.status === 'active'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                        >
                            <span>
                                {service.status === 'active'
                                    ? (isArabic ? 'إيقاف الخدمة' : 'Deactivate Service')
                                    : (isArabic ? 'تفعيل الخدمة' : 'Activate Service')}
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
                    <p className="font-bold text-sm text-gray-600">{isArabic ? 'جاري تحميل تفاصيل الخدمة...' : 'Loading service details...'}</p>
                </div>
            ) : isError || !responseData ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-16 text-center text-rose-600 font-bold">
                    {isArabic ? 'حدث خطأ أثناء تحميل تفاصيل الخدمة.' : 'Error loading service details.'}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Top Profile Hero Card */}
                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                            <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-start">
                                <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                    {service.image ? (
                                        <img src={service.image} alt={serviceName} className="w-full h-full object-cover" />
                                    ) : (
                                        <svg className="w-9 h-9 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                                        <h3 className="text-2xl font-black text-gray-900">{serviceName}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[service.status] || STATUS_STYLES.inactive}`}>
                                            {t(`status.${service.status}`)}
                                        </span>
                                        {service.type && (
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${TYPE_STYLES[service.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                {t(`types.${service.type}`)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-bold text-gray-500 flex items-center justify-center md:justify-start gap-2">
                                        <span>{isArabic ? 'القسم: ' : 'Category: '}<strong className="text-gray-800">{categoryName}</strong></span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <StarRow value={service.avg_rating} />
                                            <span className="font-extrabold text-amber-600">{Number(service.avg_rating || 0).toFixed(2)}</span>
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {/* Base Price display (Hidden for services with sub-options or zero base price) */}
                            {!hasOptions && Number(service.base_price) > 0 && (
                                <div className="bg-pink-50/50 border border-pink-100 rounded-2xl p-4 md:px-6 text-start md:text-end shrink-0 min-w-[180px]">
                                    <p className="text-[11px] font-bold text-[#E91E63] uppercase tracking-wider">{t('form.base_price')}</p>
                                    <p className="text-2xl font-black text-gray-900 mt-0.5">
                                        {service.base_price} <span className="text-xs font-bold text-gray-500">{service.price_details?.currency || 'EGP'}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100">
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
                                label={isArabic ? 'إجمالي الإيرادات' : 'Total Revenue'}
                                value={`${(stats.total_revenue || 0).toFixed(2)} EGP`}
                                accent="text-purple-600"
                                bg="bg-purple-50 text-purple-600"
                                icon={<svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" /></svg>}
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
                            {sideMenuItem('profile', t('details.tabs.profile'), 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')}
                            {sideMenuItem('schedule', isArabic ? 'المواعيد والسياسات' : 'Schedule & Policies', 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z', (service?.schedules?.length || 0) + (service?.rules ? 1 : 0))}
                            {sideMenuItem('workers', isArabic ? 'العمال المخصصون' : 'Assigned Workers', 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', service?.workers?.length || 0)}
                            {sideMenuItem('bookings', t('details.tabs.bookings'), 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', bookings.length)}
                            {sideMenuItem('reviews', t('details.tabs.reviews'), 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', reviews.length)}
                        </div>

                        {/* Active Tab Body */}
                        <div className="flex-1 w-full min-w-0 space-y-6">
                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    {/* 1. Basic Specifications & Pricing Card */}
                                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                        <h4 className="text-sm font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                            </svg>
                                            <span>{t('details.info_title')}</span>
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            <InfoItem label={t('form.service_code')} value={service.service_code} highlight />
                                            <InfoItem label={t('details.type')} value={t(`types.${service.type}`)} />
                                            <InfoItem label={t('details.status')} value={t(`status.${service.status}`)} />
                                            {!hasOptions && Number(service.base_price) > 0 && (
                                                <InfoItem label={t('form.base_price')} value={`${service.base_price || 0} ${service.price_details?.currency || 'EGP'}`} highlight />
                                            )}
                                            <InfoItem label={isArabic ? 'نوع التسعير' : 'Pricing Type'} value={service.pricing_type === 'per_hour' ? (isArabic ? 'سعر بالساعة (Per Hour)' : 'Per Hour') : (isArabic ? 'سعر بالخدمة (Per Service)' : 'Per Service')} />
                                            <InfoItem label={isArabic ? 'ساعات العمل' : 'Working Hours'} value={`${service.start_time ? service.start_time.slice(0, 5) : '—'} - ${service.end_time ? service.end_time.slice(0, 5) : '—'}`} />
                                            <InfoItem label={t('form.default_duration')} value={`${service.default_duration || '—'} ${t('form.hours')}`} />
                                            
                                            {service.has_duration_range && (
                                                <InfoItem label={isArabic ? 'نطاق المدة المتاحة' : 'Duration Range'} value={`${service.min_duration} - ${service.max_duration} ${t('form.hours')}`} />
                                            )}

                                            {(!hasOptions || isDeepCleaning) && (
                                                <InfoItem label={isArabic ? 'عدد العمال' : 'Workers Count'} value={`${service.min_workers || 1} - ${service.max_workers || 1}`} />
                                            )}

                                            {service.covered_persons_per_worker > 1 && (
                                                <InfoItem label={isArabic ? 'تغطية الأشخاص / العامل' : 'Persons per Worker'} value={`${service.covered_persons_per_worker} ${isArabic ? 'أشخاص' : 'persons'}`} />
                                            )}

                                            {isBabysitting && (
                                                <InfoItem label={isArabic ? 'نطاق عدد الأطفال' : 'Children Min-Max'} value={`${service.min_children || 1} - ${service.max_children || 1}`} />
                                            )}

                                            <InfoItem label={isArabic ? 'الجنس المتاح' : 'Available Gender'} value={service.worker_gender_options ? service.worker_gender_options.join(', ') : 'Female'} />
                                        </div>

                                        {description && (
                                            <div className="mt-5 pt-4 border-t border-gray-100">
                                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{t('details.description')}</p>
                                                <p className="text-xs font-medium text-gray-700 leading-relaxed bg-gray-50/60 p-4 rounded-2xl border border-gray-100">{description}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Sub-Item Options & Pricing Section (for Services like Sofa, Tanks, AC, Carpets, etc.) */}
                                    {service.options && service.options.length > 0 && (
                                         <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                             <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                                                 <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                                     <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                         <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                                     </svg>
                                                     <span>{isArabic ? 'خيارات وأسعار الخدمة الفرعية (Sub-Options & Pricing)' : 'Service Options & Pricing'}</span>
                                                 </h4>
                                                 <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-[#FDF0F3] text-[#E91E63] border border-[#E91E63]/20">
                                                     {service.options.length} {isArabic ? 'خيارات' : 'Options'}
                                                 </span>
                                             </div>

                                             <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-2xs">
                                                 <table className="w-full text-start text-xs border-collapse">
                                                     <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold border-b border-gray-100 text-[11px]">
                                                         <tr>
                                                             <th className="p-4 text-start">{isArabic ? 'الخيار' : 'Option'}</th>
                                                             <th className="p-4 text-start">{isArabic ? 'سعر الوحدة' : 'Unit Price'}</th>
                                                             <th className="p-4 text-center">{isArabic ? 'أقل كمية' : 'Min Qty'}</th>
                                                             <th className="p-4 text-center">{isArabic ? 'أقصى كمية' : 'Max Qty'}</th>
                                                             <th className="p-4 text-center">{isArabic ? 'الحالة' : 'Status'}</th>
                                                         </tr>
                                                     </thead>
                                                     <tbody className="divide-y divide-gray-100">
                                                         {service.options.map((opt) => (
                                                             <tr key={opt.id} className="hover:bg-gray-50/60 transition-colors bg-white">
                                                                 <td className="p-4">
                                                                     <p className="font-extrabold text-gray-900">{isArabic ? opt.name_ar : opt.name_en}</p>
                                                                     <p className="text-[11px] text-gray-400 font-semibold">{isArabic ? opt.name_en : opt.name_ar}</p>
                                                                 </td>
                                                                 <td className="p-4 font-black text-gray-900 text-sm whitespace-nowrap">
                                                                     {opt.unit_price} <span className="text-xs font-bold text-gray-500">{service.price_details?.currency || 'EGP'}</span>
                                                                 </td>
                                                                 <td className="p-4 text-center font-bold text-gray-700">{opt.min_qty ?? 1}</td>
                                                                 <td className="p-4 text-center font-bold text-gray-700">{opt.max_qty ?? 10}</td>
                                                                 <td className="p-4 text-center">
                                                                     <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                                         opt.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'
                                                                     }`}>
                                                                         {opt.status === 'active' ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Inactive')}
                                                                     </span>
                                                                 </td>
                                                             </tr>
                                                         ))}
                                                     </tbody>
                                                 </table>
                                             </div>
                                         </div>
                                    )}

                                    {/* 3. Visit Types & Discount Cards */}
                                    {service.available_visit_types && service.available_visit_types.length > 0 && (
                                         <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                             <h4 className="text-sm font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                                                 <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                     <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                                 </svg>
                                                 <span>{isArabic ? 'أنواع الزيارات والخصومات المتاحة' : 'Visit Types & Discounts'}</span>
                                             </h4>

                                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                 {service.available_visit_types.map((vt, idx) => (
                                                     <div key={idx} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3 shadow-2xs">
                                                         <div className="flex items-center gap-3">
                                                             <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 text-[#E91E63] flex items-center justify-center font-bold">
                                                                 {vt.type === 'single_visit' ? '1x' : '∞'}
                                                             </div>
                                                             <div>
                                                                 <p className="text-xs font-black text-gray-900">
                                                                     {vt.type === 'single_visit' ? (isArabic ? 'زيارة واحدة (Single Visit)' : 'Single Visit') : (isArabic ? 'زيارات متعددة / باقة (Multi-Visits)' : 'Multi-Visits / Package')}
                                                                 </p>
                                                                 <p className="text-[11px] text-gray-400 font-medium">
                                                                     {vt.discount > 0 ? (isArabic ? `خصم: ${vt.discount}%` : `Discount: ${vt.discount}%`) : (isArabic ? 'بدون خصم' : 'No discount')}
                                                                 </p>
                                                             </div>
                                                         </div>
                                                         {vt.discount > 0 && (
                                                             <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                 -{vt.discount}%
                                                             </span>
                                                         )}
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>
                                    )}

                                    {/* 2. Babysitter Age Group Calculation Rules */}
                                    {isBabysitting && service.child_age_groups && service.child_age_groups.length > 0 && (
                                        <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                            <h4 className="text-sm font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                                <span>{isArabic ? 'قواعد احتساب جليسات الأطفال حسب الفئة العمرية' : 'Babysitter Age Group Calculation Rules'}</span>
                                            </h4>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-start text-xs border-collapse">
                                                    <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold border-b border-gray-100 text-[11px]">
                                                        <tr>
                                                            <th className="p-4 text-start">{isArabic ? 'الفئة العمرية' : 'Age Group'}</th>
                                                            <th className="p-4 text-start">{isArabic ? 'السن من (شهور)' : 'Age From'}</th>
                                                            <th className="p-4 text-start">{isArabic ? 'السن إلى (شهور)' : 'Age To'}</th>
                                                            <th className="p-4 text-start">{isArabic ? 'طريقة الحساب' : 'Calculation Rule'}</th>
                                                            <th className="p-4 text-center">{isArabic ? 'نسبة الجليسات' : 'Babysitter Ratio'}</th>
                                                            <th className="p-4 text-center">{isArabic ? 'الحالة' : 'Status'}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {service.child_age_groups.map((group) => (
                                                            <tr key={group.id} className="hover:bg-gray-50/60 transition-colors bg-white">
                                                                <td className="p-4 font-bold text-gray-900">{isArabic ? group.name_ar : group.name_en}</td>
                                                                <td className="p-4 text-gray-700 font-medium">{group.age_from} m</td>
                                                                <td className="p-4 text-gray-700 font-medium">{group.age_to} m</td>
                                                                <td className="p-4 font-semibold text-gray-800">
                                                                    {group.calculation_type === 'per_child'
                                                                        ? (isArabic ? 'لكل طفل' : 'Per Child')
                                                                        : (isArabic ? 'نسبة وتناسب' : 'Ratio Based')}
                                                                </td>
                                                                <td className="p-4 text-center font-extrabold text-gray-900">
                                                                    {group.calculation_type === 'per_child'
                                                                        ? (isArabic ? `${group.required_worker_count} عامل(ة) / طفل` : `${group.required_worker_count} worker / child`)
                                                                        : (isArabic ? `${group.required_worker_count} عامل(ة) لكل ${group.children_count} أطفال` : `${group.required_worker_count} worker(s) for ${group.children_count} children`)}
                                                                </td>
                                                                <td className="p-4 text-center">
                                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                                        group.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                        {group.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. Geo-Fenced Service Zones Card */}
                                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7 space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                            <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span>{isArabic ? 'مناطق التغطية الجغرافية (Geo-Fenced Service Zones)' : 'Geo-Fenced Service Zones'}</span>
                                            </h4>
                                            {service.service_zones?.length > 0 && (
                                                <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-[#FDF0F3] text-[#E91E63] border border-[#E91E63]/20">
                                                    {service.service_zones.length} {isArabic ? 'مناطق متوفرة' : 'Zones Active'}
                                                </span>
                                            )}
                                        </div>

                                        {service.service_zones?.length ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {service.service_zones.map((zone) => (
                                                    <div
                                                        key={zone.id}
                                                        className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-[#E91E63]/30 transition-all flex items-center justify-between gap-3 shadow-2xs"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <span className="w-2.5 h-2.5 rounded-full bg-[#E91E63] shrink-0"></span>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-extrabold text-gray-800 truncate">{zone.name}</p>
                                                                {(zone.city || zone.governorate) && (
                                                                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                                                        {[zone.governorate, zone.city].filter(Boolean).join(' • ')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${zone.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
                                                            {zone.status === 'active' ? (isArabic ? 'مفعلة' : 'Active') : (isArabic ? 'معطلة' : 'Inactive')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 py-4 text-center italic">{isArabic ? 'لا توجد مناطق تغطية محددة لهذه الخدمة.' : 'No service zones assigned.'}</p>
                                        )}
                                    </div>

                                    {/* 6. Terms & Conditions Card */}
                                    {(service.terms_ar || service.terms_en) && (
                                        <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7 space-y-4">
                                            <h4 className="text-sm font-extrabold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
                                                 <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                     <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                 </svg>
                                                 <span>{isArabic ? 'الشروط والأحكام الخاصة بالخدمة' : 'Terms & Conditions'}</span>
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                 {service.terms_ar && (
                                                     <div className="p-4 bg-gray-50/60 rounded-2xl border border-gray-100 space-y-1.5" dir="rtl">
                                                         <p className="text-[11px] font-bold text-gray-400 uppercase">الشروط بالعربية</p>
                                                         <p className="text-xs font-medium text-gray-700 leading-relaxed whitespace-pre-line">{service.terms_ar}</p>
                                                     </div>
                                                 )}
                                                 {service.terms_en && (
                                                     <div className="p-4 bg-gray-50/60 rounded-2xl border border-gray-100 space-y-1.5" dir="ltr">
                                                         <p className="text-[11px] font-bold text-gray-400 uppercase">Terms in English</p>
                                                         <p className="text-xs font-medium text-gray-700 leading-relaxed whitespace-pre-line">{service.terms_en}</p>
                                                     </div>
                                                 )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab: Schedule & Policies */}
                            {activeTab === 'schedule' && (
                                <div className="space-y-6">
                                    {/* Working Days & Shifts */}
                                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                                            <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>{isArabic ? 'جدول المواعيد وأيام العمل والورديات' : 'Working Schedule & Shifts'}</span>
                                            </h4>
                                            {service.schedules?.length > 0 && (
                                                <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-[#FDF0F3] text-[#E91E63] border border-[#E91E63]/20">
                                                    {service.schedules.length} {isArabic ? 'ورديات' : 'Shifts'}
                                                </span>
                                            )}
                                        </div>

                                        {service.schedules?.length ? (
                                            <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-2xs">
                                                <table className="w-full text-start text-xs border-collapse">
                                                    <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold border-b border-gray-100 text-[11px]">
                                                        <tr>
                                                            <th className="p-4 text-start">{isArabic ? 'اليوم' : 'Day'}</th>
                                                            <th className="p-4 text-start">{isArabic ? 'وقت البدء' : 'Start Time'}</th>
                                                            <th className="p-4 text-start">{isArabic ? 'وقت الانتهاء' : 'End Time'}</th>
                                                            <th className="p-4 text-center">{isArabic ? 'الحالة' : 'Status'}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {service.schedules.map((sch, i) => (
                                                            <tr key={i} className="hover:bg-gray-50/60 transition-colors bg-white">
                                                                <td className="p-4 font-extrabold text-gray-900 capitalize">{sch.day}</td>
                                                                <td className="p-4 font-bold text-gray-700">{sch.start_time?.slice(0, 5)}</td>
                                                                <td className="p-4 font-bold text-gray-700">{sch.end_time?.slice(0, 5)}</td>
                                                                <td className="p-4 text-center">
                                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                                        sch.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'
                                                                    }`}>
                                                                        {sch.is_active ? (isArabic ? 'متاح' : 'Active') : (isArabic ? 'معطل' : 'Inactive')}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 py-6 text-center italic">{isArabic ? 'لا توجد ورديات محددة، تتبع أوقات العمل العامة للخدمة.' : 'No specific shifts defined. Default service working hours apply.'}</p>
                                        )}
                                    </div>

                                    {/* Booking, Cancellation & Rescheduling Policies */}
                                    {service.rules && (
                                        <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                            <h4 className="text-sm font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                                </svg>
                                                <span>{isArabic ? 'سياسات وقواعد الحجز والإلغاء وإعادة الجدولة' : 'Booking, Cancellation & Rescheduling Policies'}</span>
                                            </h4>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                <InfoItem label={isArabic ? 'إمكانية الإلغاء' : 'Allow Cancellation'} value={service.rules.allow_cancel ? (isArabic ? 'مسموح' : 'Allowed') : (isArabic ? 'غير مسموح' : 'Not Allowed')} highlight />
                                                <InfoItem label={isArabic ? 'مهلة الإلغاء المجاني' : 'Free Cancel Window'} value={`${service.rules.free_cancel_cutoff_hours ?? 24} ${isArabic ? 'ساعة قبل الموعد' : 'hours before'}`} />
                                                <InfoItem label={isArabic ? 'إمكانية إعادة الجدولة' : 'Allow Reschedule'} value={service.rules.allow_reschedule ? (isArabic ? 'مسموح' : 'Allowed') : (isArabic ? 'غير مسموح' : 'Not Allowed')} highlight />
                                                <InfoItem label={isArabic ? 'مهلة إعادة الجدولة' : 'Reschedule Window'} value={`${service.rules.reschedule_cutoff_hours ?? 12} ${isArabic ? 'ساعة قبل الموعد' : 'hours before'}`} />
                                                <InfoItem label={isArabic ? 'الحجز في نفس اليوم' : 'Same Day Booking'} value={service.rules.allow_same_day ? (isArabic ? 'متاح' : 'Allowed') : (isArabic ? 'غير متاح' : 'Not Allowed')} />
                                                <InfoItem label={isArabic ? 'أقصى أيام للحجز المسبق' : 'Max Advance Booking'} value={`${service.rules.max_advance_booking_days ?? 30} ${isArabic ? 'يوم' : 'days'}`} />
                                                <InfoItem label={isArabic ? 'مهلة الوصول (دقائق)' : 'Arrival Buffer'} value={`${service.rules.arrival_buffer_minutes ?? 15} ${isArabic ? 'دقيقة' : 'min'}`} />
                                                <InfoItem label={isArabic ? 'فترة السماح للتأخير' : 'Late Arrival Grace'} value={`${service.rules.late_arrival_grace_minutes ?? 15} ${isArabic ? 'دقيقة' : 'min'}`} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab: Assigned Workers */}
                            {activeTab === 'workers' && (
                                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                    <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                                        <h4 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                            </svg>
                                            <span>{isArabic ? 'العمال المخصصون لهذه الخدمة' : 'Assigned Workers'}</span>
                                        </h4>
                                        {service.workers?.length > 0 && (
                                            <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-[#FDF0F3] text-[#E91E63] border border-[#E91E63]/20">
                                                {service.workers.length} {isArabic ? 'عمال متاحين' : 'Workers'}
                                            </span>
                                        )}
                                    </div>

                                    {service.workers?.length ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {service.workers.map((w) => (
                                                <div key={w.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/40 hover:bg-white hover:border-[#E91E63]/30 transition-all flex items-center justify-between gap-3 shadow-2xs">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-11 h-11 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                                                            {w.image ? (
                                                                <img src={w.image} alt={w.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-extrabold text-gray-900 truncate">{w.name || w.full_name}</p>
                                                            <p className="text-[11px] text-gray-400 truncate">{w.nationality || w.gender || '—'}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                                        w.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {w.status === 'active' ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Inactive')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 py-6 text-center italic">{isArabic ? 'لا يوجد عمال مخصصون حالياً لهذه الخدمة.' : 'No workers assigned to this service yet.'}</p>
                                    )}
                                </div>
                            )}

                            {/* Tab: Bookings */}
                            {activeTab === 'bookings' && (
                                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-start text-xs border-collapse">
                                            <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold border-b border-gray-100 text-[11px]">
                                                <tr>
                                                    <th className="p-4 text-start">{isArabic ? 'رقم الحجز' : 'Ref'}</th>
                                                    <th className="p-4 text-start">{isArabic ? 'العميل' : 'Customer'}</th>
                                                    <th className="p-4 text-start">{isArabic ? 'العامل' : 'Worker'}</th>
                                                    <th className="p-4 text-start">{isArabic ? 'التاريخ' : 'Date'}</th>
                                                    <th className="p-4 text-start">{isArabic ? 'القيمة' : 'Amount'}</th>
                                                    <th className="p-4 text-center">{isArabic ? 'الحالة' : 'Status'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {bookings.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="6" className="p-12 text-center text-gray-400 text-xs bg-white font-medium">
                                                            {isArabic ? 'لا توجد حجوزات مسجلة لهذه الخدمة.' : 'No bookings recorded.'}
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
                                                            <td className="p-4 text-gray-600 font-medium">{b.worker_name || (b.workers?.length ? b.workers.map(w => w.name || w.full_name).join(', ') : '—')}</td>
                                                            <td className="p-4 whitespace-nowrap text-gray-500 font-medium">{b.booking_date}</td>
                                                            <td className="p-4 font-extrabold text-gray-900 whitespace-nowrap">{b.total_amount} EGP</td>
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

                            {/* Tab: Reviews */}
                            {activeTab === 'reviews' && (
                                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-start text-xs border-collapse">
                                            <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold border-b border-gray-100 text-[11px]">
                                                <tr>
                                                    <th className="p-4 text-start">{isArabic ? 'رقم الحجز' : 'Booking Ref'}</th>
                                                    <th className="p-4 text-start">{isArabic ? 'العميل' : 'Customer'}</th>
                                                    <th className="p-4 text-start">{isArabic ? 'النجوم' : 'Rating'}</th>
                                                    <th className="p-4 text-start">{isArabic ? 'التعليق' : 'Comment'}</th>
                                                    <th className="p-4 text-start">{isArabic ? 'التاريخ' : 'Date'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {reviews.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="p-12 text-center text-gray-400 text-xs bg-white font-medium">
                                                            {isArabic ? 'لا توجد تقييمات لهذه الخدمة.' : 'No reviews recorded.'}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    reviews.map((r) => (
                                                        <tr key={r.id} className="hover:bg-gray-50/60 transition-colors bg-white">
                                                            <td className="p-4 font-mono font-bold">
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
                                                            <td className="p-4 font-bold text-gray-900">{r.customer_name || r.customer?.name || (r.customer?.first_name ? `${r.customer.first_name} ${r.customer.last_name || ''}` : '—')}</td>
                                                            <td className="p-4 text-amber-500 font-extrabold whitespace-nowrap">⭐ {r.rating} / 5</td>
                                                            <td className="p-4 max-w-[240px] truncate text-gray-600 font-medium" title={r.comment}>{r.comment || '-'}</td>
                                                            <td className="p-4 text-gray-500 font-medium whitespace-nowrap">{r.created_at}</td>
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
