import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { hasPermission } from '../../utils/permissions.js';

const STATUS_STYLES = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    inactive: 'bg-rose-50 text-rose-700 border-rose-200/80',
};

const EXPIRED_STYLES = {
    expired: 'bg-amber-50 text-amber-700 border-amber-200/80',
    valid: 'bg-blue-50 text-blue-700 border-blue-200/80',
};

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

const InfoItem = ({ label, value, highlight = false, badge = false, badgeBg = 'bg-gray-100 text-gray-700' }) => (
    <div className="flex items-start justify-between gap-3 p-3.5 bg-gray-50/60 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-colors">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        {badge ? (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${badgeBg}`}>
                {value}
            </span>
        ) : (
            <span className={`text-xs ${highlight ? 'font-black text-[#E91E63]' : 'font-bold text-gray-800'} text-end truncate max-w-[200px]`}>
                {value ?? '—'}
            </span>
        )}
    </div>
);

export default function CouponDetails() {
    const { id: couponId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('coupons');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    // Fetch coupon detail query
    const { data: coupon, isLoading, isError } = useQuery({
        queryKey: ['couponDetail', couponId],
        queryFn: async () => (await axiosInstance.get(`/admin/coupons/${couponId}`)).data.data,
        enabled: !!couponId,
    });

    // Toggle status mutation
    const toggleStatusMutation = useMutation({
        mutationFn: async () => {
            const fullDetails = (await axiosInstance.get(`/admin/coupons/${couponId}`)).data.data;
            const payload = {
                name: fullDetails.name,
                code: fullDetails.code,
                type: fullDetails.type,
                value: Number(fullDetails.value),
                start_date: fullDetails.start_date,
                end_date: fullDetails.end_date,
                usage_limit: fullDetails.usage_limit != null ? Number(fullDetails.usage_limit) : null,
                user_usage_limit: Number(fullDetails.user_usage_limit),
                completed_bookings_count: Number(fullDetails.completed_bookings_count),
                is_for_all_users: Boolean(fullDetails.is_for_all_users),
                is_for_all_cities: Boolean(fullDetails.is_for_all_cities),
                is_for_all_services: Boolean(fullDetails.is_for_all_services),
                status: fullDetails.status === 'active' ? 'inactive' : 'active',
            };
            if (!fullDetails.is_for_all_users) {
                payload.users = (fullDetails.users || []).map(u => u.id);
            }
            if (!fullDetails.is_for_all_cities) {
                const zones = fullDetails.service_zones || fullDetails.serviceZones || [];
                if (zones.length > 0) {
                    payload.service_zone_ids = zones.map(z => z.id);
                }
            }
            if (!fullDetails.is_for_all_services) {
                payload.services = (fullDetails.services || []).map(s => ({
                    id: s.id,
                    allowed_visit_types: s.pivot?.allowed_visit_types || null,
                }));
            }
            return axiosInstance.put(`/admin/coupons/${couponId}`, payload);
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم تغيير حالة الكوبون' : 'Coupon status updated'));
            queryClient.invalidateQueries({ queryKey: ['couponDetail', couponId] });
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || (isArabic ? 'فشل تغيير الحالة' : 'Failed to update status'));
        },
    });

    const copyCode = () => {
        if (coupon?.code) {
            navigator.clipboard.writeText(coupon.code);
            toast.success(isArabic ? 'تم نسخ كود الكوبون' : 'Coupon code copied to clipboard');
        }
    };

    return (
        <div className="space-y-6 font-main w-full pb-12">
            {/* Top Navigation & Breadcrumb */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
                <div>
                    <button
                        onClick={() => navigate('/coupons')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E91E63] transition-colors mb-1.5 outline-none group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>{isArabic ? 'العودة لقائمة الكوبونات' : 'Back to Coupons'}</span>
                    </button>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'تفاصيل الكوبون وقواعد الخصم' : 'Coupon Details & Settings'}
                    </h2>
                </div>

                {coupon && hasPermission('coupons.edit') && (
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => navigate(`/coupons/${couponId}/edit`)}
                            className="px-4 h-10 rounded-xl text-xs font-bold bg-[#E91E63] text-white hover:bg-[#D81B60] transition-colors shadow-2xs flex items-center gap-2 outline-none"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                            <span>{isArabic ? 'تعديل الكوبون' : 'Edit Coupon'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleStatusMutation.mutate()}
                            disabled={toggleStatusMutation.isPending}
                            className={`px-4 h-10 rounded-xl text-xs font-bold border active:scale-95 transition-all flex items-center gap-2 outline-none ${
                                coupon.status === 'active'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                        >
                            <span>
                                {coupon.status === 'active'
                                    ? (isArabic ? 'تعطيل الكوبون' : 'Deactivate')
                                    : (isArabic ? 'تفعيل الكوبون' : 'Activate')}
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
                    <p className="font-bold text-sm text-gray-600">{isArabic ? 'جاري تحميل تفاصيل الكوبون...' : 'Loading coupon details...'}</p>
                </div>
            ) : isError || !coupon ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-16 text-center text-rose-600 font-bold">
                    {isArabic ? 'حدث خطأ أثناء تحميل تفاصيل الكوبون.' : 'Error loading coupon details.'}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Hero Header Card */}
                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute top-0 end-0 w-96 h-96 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                            <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-start">
                                <div className="p-4 bg-pink-50 border-2 border-pink-100 rounded-3xl text-center shrink-0">
                                    <span className="font-mono text-2xl md:text-3xl font-black text-[#E91E63] tracking-wider block">{coupon.code}</span>
                                    <button
                                        type="button"
                                        onClick={copyCode}
                                        className="mt-1 text-[10px] font-extrabold text-[#E91E63] hover:underline uppercase tracking-wider block mx-auto outline-none"
                                    >
                                        📋 {isArabic ? 'نسخ الكود' : 'Copy Code'}
                                    </button>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                                        <h3 className="text-2xl font-black text-gray-900">{coupon.name}</h3>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${STATUS_STYLES[coupon.status] || 'bg-gray-100 text-gray-600'}`}>
                                            <span className={`w-2 h-2 rounded-full ${coupon.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            {t(`status.${coupon.status}`)}
                                        </span>
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${coupon.is_expired ? EXPIRED_STYLES.expired : EXPIRED_STYLES.valid}`}>
                                            {coupon.is_expired ? (isArabic ? 'منتهي الصلاحية' : 'Expired') : (isArabic ? 'ساري الصلاحية' : 'Valid')}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-500">
                                        {isArabic ? 'نوع الخصم: ' : 'Discount Type: '}
                                        <span className="text-gray-900 font-extrabold">{t(`types.${coupon.type}`)}</span>
                                        {' · '}
                                        <span className="text-[#E91E63] font-black text-sm">
                                            {coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value} EGP`}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Metric Stat Cards Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100">
                            <StatCard
                                label={t('details.used_count')}
                                value={coupon.used_count || 0}
                                bg="bg-blue-50 text-blue-600"
                                icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>}
                            />
                            <StatCard
                                label={t('details.usage_limit')}
                                value={coupon.usage_limit ?? '∞'}
                                bg="bg-purple-50 text-purple-600"
                                icon={<svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>}
                            />
                            <StatCard
                                label={t('details.user_usage_limit')}
                                value={coupon.user_usage_limit || 1}
                                accent="text-emerald-600"
                                bg="bg-emerald-50 text-emerald-600"
                                icon={<svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            />
                            <StatCard
                                label={t('details.completed_bookings_count')}
                                value={coupon.completed_bookings_count || 0}
                                accent="text-[#E91E63]"
                                bg="bg-pink-50 text-[#E91E63]"
                                icon={<svg className="w-5 h-5 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            />
                        </div>
                    </div>

                    {/* Detailed Specifications Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Section 1: Basic Config & Validity */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                <h4 className="text-sm font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                                    </svg>
                                    <span>{t('details.basic_info')}</span>
                                </h4>

                                <div className="space-y-3">
                                    <InfoItem label={t('form.name')} value={coupon.name} />
                                    <InfoItem label={t('form.code')} value={coupon.code} highlight />
                                    <InfoItem label={t('form.type')} value={t(`types.${coupon.type}`)} />
                                    <InfoItem label={t('form.value')} value={coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value} EGP`} highlight />
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                <h4 className="text-sm font-extrabold text-gray-900 mb-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{t('details.validity')}</span>
                                </h4>

                                <div className="space-y-3">
                                    <InfoItem label={t('details.start_date')} value={coupon.start_date} />
                                    <InfoItem label={t('details.end_date')} value={coupon.end_date} />
                                    <InfoItem
                                        label={isArabic ? 'الحالة العشائرية' : 'Expiry Status'}
                                        value={coupon.is_expired ? (isArabic ? 'منتهي الصلاحية' : 'Expired') : (isArabic ? 'ساري العمل' : 'Active & Valid')}
                                        badge
                                        badgeBg={coupon.is_expired ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Targeting & Restrictions */}
                        <div className="space-y-6">
                            {/* Users & Geographic Targeting */}
                            <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7 space-y-5">
                                <h4 className="text-sm font-extrabold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>{t('details.targeting')}</span>
                                </h4>

                                {/* Users target */}
                                <div>
                                    <p className="text-xs font-bold text-gray-700 mb-2">👥 {t('form.is_for_all_users')}</p>
                                    {coupon.is_for_all_users ? (
                                        <span className="text-xs font-bold px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl inline-block">
                                            ✓ {t('details.all_users')}
                                        </span>
                                    ) : (
                                        <div className="space-y-2">
                                            <span className="text-xs font-bold px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl inline-block">
                                                {t('details.specific_users', { count: coupon.users_count })}
                                            </span>
                                            {coupon.users && coupon.users.length > 0 && (
                                                <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-2xl p-2 bg-gray-50/60 space-y-1.5">
                                                    {coupon.users.map((u) => (
                                                        <div key={u.id} className="text-xs text-gray-700 flex justify-between items-center p-2 bg-white rounded-xl border border-gray-100">
                                                            <span className="font-bold text-gray-900 truncate">{u.name}</span>
                                                            <span className="text-gray-400 font-mono text-[11px] truncate">{u.email}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Cities target */}
                                <div className="pt-3 border-t border-gray-100">
                                    <p className="text-xs font-bold text-gray-700 mb-2">📍 {t('form.is_for_all_cities')}</p>
                                    {coupon.is_for_all_cities ? (
                                        <span className="text-xs font-bold px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl inline-block">
                                            ✓ {t('details.all_cities')}
                                        </span>
                                    ) : (
                                        <div className="space-y-2">
                                            <span className="text-xs font-bold px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl inline-block">
                                                {t('details.specific_cities', { count: coupon.cities_count })}
                                            </span>
                                            {coupon.cities && coupon.cities.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {coupon.cities.map((c) => (
                                                        <span key={c.id} className="text-xs font-bold bg-[#FDF0F3] text-[#E91E63] border border-pink-100 px-3 py-1 rounded-xl shadow-2xs">
                                                            {c.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Service Zones constraint */}
                                {(coupon.service_zones || coupon.serviceZones) && (coupon.service_zones || coupon.serviceZones).length > 0 && (
                                    <div className="pt-3 border-t border-gray-100">
                                        <p className="text-xs font-bold text-gray-700 mb-2">🏢 {t('details.service_zones', { defaultValue: 'مناطق التغطية الجغرافية المحددة:' })}</p>
                                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                                            {(coupon.service_zones || coupon.serviceZones).map((z) => (
                                                <span key={z.id} className="text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-xl">
                                                    {z.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Service Constraints */}
                            <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 md:p-7">
                                <h4 className="text-sm font-extrabold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                    </svg>
                                    <span>{t('details.service_constraints')}</span>
                                </h4>

                                {coupon.is_for_all_services ? (
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl inline-block">
                                            ✓ {t('details.all_services')}
                                        </span>
                                        {coupon.min_workers && coupon.min_workers > 0 ? (
                                            <p className="text-xs text-gray-600 font-bold mt-2">
                                                {isArabic ? `الحد الأدنى لعدد العاملات: ${coupon.min_workers}` : `Min Workers: ${coupon.min_workers}`}
                                            </p>
                                        ) : null}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <span className="text-xs font-bold px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl inline-block">
                                            {t('details.specific_services', { count: coupon.services_count })}
                                        </span>
                                        {coupon.services && coupon.services.length > 0 && (
                                            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                                {coupon.services.map((s) => (
                                                    <div key={s.id} className="p-3.5 border border-gray-100 rounded-2xl bg-gray-50/60 space-y-2">
                                                        <h6 className="text-xs font-extrabold text-gray-900 border-b border-gray-200/60 pb-1.5">{s.name}</h6>

                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">{t('details.allowed_visit_types')}</p>
                                                            {s.pivot?.allowed_visit_types && s.pivot.allowed_visit_types.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {s.pivot.allowed_visit_types.map((vt) => (
                                                                        <span key={vt} className="text-[10px] font-bold bg-white text-gray-800 px-2 py-0.5 rounded-lg border border-gray-100 shadow-2xs">
                                                                            {vt}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-[10px] text-gray-400 italic">{t('details.no_visit_types')}</p>
                                                            )}
                                                        </div>

                                                        {s.pivot?.min_workers && s.pivot.min_workers > 0 ? (
                                                            <div className="pt-1.5 border-t border-gray-200/60">
                                                                <p className="text-[10px] text-gray-600 font-bold">
                                                                    {isArabic ? `الحد الأدنى للعاملات: ${s.pivot.min_workers}` : `Min Workers: ${s.pivot.min_workers}`}
                                                                </p>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
