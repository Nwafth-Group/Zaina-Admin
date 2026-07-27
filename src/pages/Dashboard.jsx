import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../api/axios.js';
import { TrendBars, TrendArea, Donut, HBars } from '../component/Charts.jsx';

const STATUS_COLORS = {
    Upcoming: '#3B82F6',
    inService: '#F59E0B',
    completed: '#22C55E',
    cancelled: '#EF4444',
};

const Panel = ({ title, action, className = '', children }) => (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-5 ${className}`}>
        {(title || action) && (
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                {title && <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#E91E63]"></span>
                    {title}
                </h3>}
                {action}
            </div>
        )}
        {children}
    </div>
);

const StatCard = ({ icon, label, value, tint }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex items-center gap-3.5 hover:shadow-md hover:border-gray-300 transition-all group">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tint} group-hover:scale-105 transition-transform`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>{icon}</svg>
        </span>
        <div className="min-w-0">
            <p className="text-xs font-bold text-gray-400 truncate">{label}</p>
            <p className="text-xl font-black text-gray-900 truncate mt-0.5">{value}</p>
        </div>
    </div>
);

const CALENDAR_ICON = 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5';

export default function Dashboard() {
    const { t, i18n } = useTranslation('dashboard');
    const isArabic = i18n.language?.startsWith('ar');
    const [activeStatus, setActiveStatus] = useState(null);
    const [detailsId, setDetailsId] = useState(null);
    const [selectedGovernorate, setSelectedGovernorate] = useState('');
    const [selectedZoneId, setSelectedZoneId] = useState('');

    // Fetch all service zones so governorate & zone options are always populated
    const { data: zonesResponse } = useQuery({
        queryKey: ['all-service-zones-for-dashboard'],
        queryFn: async () => (await axiosInstance.get('/admin/service-zones?per_page=100')).data,
    });

    const serviceZonesList = useMemo(() => {
        const items = zonesResponse?.data?.items || zonesResponse?.data || [];
        return Array.isArray(items) ? items : [];
    }, [zonesResponse]);

    const governorateOptions = useMemo(() => {
        const set = new Set();
        serviceZonesList.forEach((z) => {
            if (z.governorate) set.add(z.governorate);
        });
        if (set.size === 0) {
            ['القاهرة', 'الجيزة', 'القليوبية', 'الإسكندرية', 'الدقهلية', 'الغربية'].forEach(g => set.add(g));
        }
        return Array.from(set);
    }, [serviceZonesList]);

    const filteredZoneOptions = useMemo(() => {
        if (!selectedGovernorate) return serviceZonesList;
        return serviceZonesList.filter((z) => z.governorate === selectedGovernorate);
    }, [serviceZonesList, selectedGovernorate]);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['dashboardStats', selectedGovernorate, selectedZoneId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedGovernorate) params.append('governorate', selectedGovernorate);
            if (selectedZoneId) params.append('service_zone_id', selectedZoneId);
            return (await axiosInstance.get(`/admin/dashboard/stats?${params.toString()}`)).data.data;
        },
    });

    if (isError) return <div className="p-8 text-red-500 font-bold">{error.message}</div>;

    if (isLoading || !data) {
        return (
            <div className="flex justify-center items-center py-24">
                <svg className="animate-spin h-8 w-8 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
            </div>
        );
    }

    const { cards, bookings_by_status: byStatus, trend, top_services: topServices, upcoming } = data;
    const fmt = (n) => Number(n || 0).toLocaleString();

    const statusSegments = Object.entries(byStatus).map(([key, value]) => ({
        label: t(`status.${key}`, key),
        value,
        color: STATUS_COLORS[key] || '#9CA3AF',
    }));

    return (
        <>
        <div className="space-y-6 w-full font-main">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'لوحة التحكم والتحليلات' : 'Dashboard & Analytics Overview'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'ملخص شامل لمؤشرات الأداء والإيرادات حسب المنطقة الجغرافية.' : 'Comprehensive summary of performance metrics and revenue by location.'}
                    </p>
                </div>

                {/* Location Filter Controls */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Governorate Select */}
                    <div className="relative flex-1 sm:w-48">
                        <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase px-1">
                            {isArabic ? 'المحافظة' : 'Governorate'}
                        </label>
                        <select
                            value={selectedGovernorate}
                            onChange={(e) => {
                                setSelectedGovernorate(e.target.value);
                                setSelectedZoneId('');
                            }}
                            className="w-full bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-2xl px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-[#E91E63] focus:ring-2 focus:ring-[#E91E63]/10 transition-all cursor-pointer"
                        >
                            <option value="">{isArabic ? '🌐 جميع المحافظات' : '🌐 All Governorates'}</option>
                            {governorateOptions.map((gov) => (
                                <option key={gov} value={gov}>📍 {gov}</option>
                            ))}
                        </select>
                    </div>

                    {/* Zone Select */}
                    <div className="relative flex-1 sm:w-56">
                        <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase px-1">
                            {isArabic ? 'منطقة التغطية' : 'Service Zone'}
                        </label>
                        <select
                            value={selectedZoneId}
                            onChange={(e) => setSelectedZoneId(e.target.value)}
                            className="w-full bg-gray-50 hover:bg-gray-100/80 border border-gray-200 rounded-2xl px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-[#E91E63] focus:ring-2 focus:ring-[#E91E63]/10 transition-all cursor-pointer"
                        >
                            <option value="">{isArabic ? '🏘️ جميع المناطق' : '🏘️ All Zones'}</option>
                            {filteredZoneOptions.map((z) => (
                                <option key={z.id} value={z.id}>🚏 {z.name}</option>
                            ))}
                        </select>
                    </div>

                    {(selectedGovernorate || selectedZoneId) && (
                        <button
                            onClick={() => {
                                setSelectedGovernorate('');
                                setSelectedZoneId('');
                            }}
                            className="self-end px-3 py-2 rounded-2xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors shrink-0 flex items-center gap-1"
                            title={isArabic ? 'إلغاء التصفية' : 'Reset Filter'}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {isArabic ? 'إلغاء' : 'Reset'}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

                {/* Left column — upcoming bookings as a card list */}
                <div className="order-2 lg:order-1 lg:col-span-1">
                    <Panel title={t('charts.upcoming_title')}>
                        {upcoming.length === 0 ? (
                            <p className="text-xs font-bold text-gray-400 py-6 text-center">{t('empty_upcoming')}</p>
                        ) : (
                            <div className="space-y-2.5">
                                {upcoming.map((b) => (
                                    <div key={b.id} onClick={() => setDetailsId(b.id)} className="cursor-pointer rounded-xl border border-gray-100 p-3.5 transition-all hover:border-[#E91E63]/30 hover:bg-[#FDF0F3]/30 shadow-2xs">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-[11px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{b.booking_ref}</span>
                                            <span className="text-xs font-black text-gray-900 whitespace-nowrap">{b.total_amount} <span className="text-[10px] font-normal text-gray-400">{b.currency}</span></span>
                                        </div>
                                        <p className="mt-2 font-bold text-xs text-gray-900 truncate">{b.customer_name || '—'}</p>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{b.service_name || '—'}</p>
                                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                                            <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={CALENDAR_ICON} /></svg>
                                            <span className="whitespace-nowrap">{b.booking_date || '—'}</span>
                                            {b.time_slot && <span className="whitespace-nowrap" dir="ltr">· {b.time_slot}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Panel>
                </div>

                {/* Right column — stats, bookings chart, then the other charts below it */}
                <div className="order-1 lg:order-2 lg:col-span-2 space-y-5">

                    {/* Stat cards */}
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3.5">
                        <StatCard
                            label={t('cards.revenue')} value={`${fmt(cards.revenue)} ${cards.currency}`} tint="bg-pink-50 text-[#E91E63]"
                            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                        />
                        <StatCard
                            label={t('cards.bookings_total')} value={fmt(cards.bookings_total)} tint="bg-indigo-50 text-indigo-600"
                            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />}
                        />
                        <StatCard
                            label={t('cards.upcoming')} value={fmt(cards.bookings_upcoming)} tint="bg-blue-50 text-blue-600"
                            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />}
                        />
                        <StatCard
                            label={t('cards.active_services')} value={fmt(cards.active_services)} tint="bg-amber-50 text-amber-600"
                            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />}
                        />
                        <StatCard
                            label={t('cards.workers')} value={fmt(cards.workers)} tint="bg-teal-50 text-teal-600"
                            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />}
                        />
                        <StatCard
                            label={t('cards.customers')} value={fmt(cards.customers)} tint="bg-purple-50 text-purple-600"
                            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />}
                        />
                    </div>

                    {/* Bookings bar chart */}
                    <Panel title={t('charts.bookings_trend')}>
                        <TrendBars data={trend.map((d) => ({ label: d.label, value: d.count }))} />
                    </Panel>

                    {/* Two charts below the bookings bar chart */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Panel title={t('charts.by_status')}>
                            <Donut segments={statusSegments} onSelect={(seg) => setActiveStatus(seg ? seg.label : null)} />
                            <ul className="mt-4 space-y-1">
                                {statusSegments.map((s) => {
                                    const on = activeStatus === s.label;
                                    return (
                                        <li key={s.label} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${on ? 'bg-gray-50' : ''}`}>
                                            <span className={`flex items-center gap-2 ${on ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                                {s.label}
                                            </span>
                                            <span className="font-extrabold text-gray-900">{s.value}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Panel>

                        <Panel title={t('charts.top_services')}>
                            {topServices.length === 0
                                ? <p className="text-xs font-bold text-gray-400 py-6 text-center">{t('empty_services')}</p>
                                : <HBars items={topServices.map((s) => ({ label: s.name, value: s.count }))} />}
                        </Panel>
                    </div>

                    {/* Revenue trend */}
                    <Panel title={t('charts.revenue_trend')}>
                        <TrendArea data={trend.map((d) => ({ label: d.label, value: d.revenue }))} gradientId="revenue-grad" />
                    </Panel>
                </div>
            </div>
        </div>

        </>
    );
}
