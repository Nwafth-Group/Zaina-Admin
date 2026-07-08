import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios.js';
import { FormSection } from '../../components/form/FormKit';

const Row = ({ label, value }) => (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-b-0">
        <span className="text-sm text-gray-500 shrink-0">{label}</span>
        <span className="text-sm font-semibold text-gray-800 text-end">{value ?? '—'}</span>
    </div>
);

export default function CouponDetailsModal({ couponId, onClose }) {
    const { t, i18n } = useTranslation('coupons');
    const isArabic = i18n.language?.startsWith('ar');

    const { data: coupon, isLoading } = useQuery({
        queryKey: ['couponDetail', couponId],
        queryFn: async () => (await axiosInstance.get(`/admin/coupons/${couponId}`)).data.data,
        enabled: !!couponId,
    });

    return (
        <div className="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-col font-main animate-fade-in">
            {/* Header */}
            <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 bg-white border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                    <h3 className="text-xl font-bold text-gray-800 truncate">
                        {t('details.title')} {coupon && <span className="font-mono text-base text-[#E91E63] bg-[#FDF0F3] px-2 py-0.5 rounded border border-[#FAD2DC] ml-2">{coupon.code}</span>}
                    </h3>
                    {coupon && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${coupon.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            {t(`status.${coupon.status}`)}
                        </span>
                    )}
                    {coupon && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${coupon.is_expired ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {coupon.is_expired ? t('details.expired') : t('details.not_expired')}
                        </span>
                    )}
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors" aria-label={t('details.close')}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto">
                {isLoading || !coupon ? (
                    <div className="flex justify-center items-center h-full">
                        <svg className="animate-spin h-8 w-8 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                        </svg>
                    </div>
                ) : (
                    <div className="w-full max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Column 1: Config Details */}
                        <div className="space-y-6">
                            <FormSection icon="info" title={t('details.basic_info')}>
                                <Row label={t('form.name')} value={coupon.name} />
                                <Row label={t('form.code')} value={coupon.code} />
                                <Row label={t('form.type')} value={t(`types.${coupon.type}`)} />
                                <Row label={t('form.value')} value={coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value} EGP`} />
                                <Row label={t('details.max_discount')} value={coupon.max_discount ? `${coupon.max_discount} EGP` : '—'} />
                                <Row label={t('details.min_booking_amount')} value={`${coupon.min_booking_amount} EGP`} />
                            </FormSection>

                            <FormSection icon="clock" title={t('details.validity')}>
                                <Row label={t('details.start_date')} value={coupon.start_date} />
                                <Row label={t('details.end_date')} value={coupon.end_date} />
                            </FormSection>

                            <FormSection icon="shield" title={t('details.limits')}>
                                <Row label={t('details.usage_limit')} value={coupon.usage_limit ?? '—'} />
                                <Row label={t('details.user_usage_limit')} value={coupon.user_usage_limit} />
                                <Row label={t('details.used_count')} value={coupon.used_count} />
                                <Row label={t('details.completed_bookings_count')} value={coupon.completed_bookings_count} />
                            </FormSection>
                        </div>

                        {/* Column 2: Targeting Constraints */}
                        <div className="space-y-6">
                            <FormSection icon="user" title={t('details.targeting')}>
                                {/* Users target */}
                                <div className="mb-4">
                                    <h5 className="text-sm font-bold text-gray-700 mb-2">👥 {t('form.is_for_all_users')}</h5>
                                    {coupon.is_for_all_users ? (
                                        <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md block text-center">
                                            {t('details.all_users')}
                                        </span>
                                    ) : (
                                        <div className="space-y-2">
                                            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md block text-center">
                                                {t('details.specific_users', { count: coupon.users_count })}
                                            </span>
                                            {coupon.users && coupon.users.length > 0 && (
                                                <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-lg p-2 bg-gray-50/50 space-y-1">
                                                    {coupon.users.map((u) => (
                                                        <div key={u.id} className="text-xs text-gray-600 flex justify-between p-1 bg-white rounded border border-gray-50">
                                                            <span className="font-medium text-gray-700 truncate max-w-[150px]">{u.name}</span>
                                                            <span className="text-gray-400 truncate max-w-[150px]">{u.email}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Cities target */}
                                <div>
                                    <h5 className="text-sm font-bold text-gray-700 mb-2">📍 {t('form.is_for_all_cities')}</h5>
                                    {coupon.is_for_all_cities ? (
                                        <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md block text-center">
                                            {t('details.all_cities')}
                                        </span>
                                    ) : (
                                        <div className="space-y-2">
                                            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md block text-center">
                                                {t('details.specific_cities', { count: coupon.cities_count })}
                                            </span>
                                            {coupon.cities && coupon.cities.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {coupon.cities.map((c) => (
                                                        <span key={c.id} className="text-xs bg-white text-gray-700 border border-gray-100 px-2 py-0.5 rounded shadow-sm">
                                                            {c.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Areas constraint */}
                                {coupon.areas && coupon.areas.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <h5 className="text-sm font-bold text-gray-700 mb-2">🏢 {t('details.areas', { count: coupon.areas_count })}</h5>
                                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                            {coupon.areas.map((a) => (
                                                <span key={a.id} className="text-xs bg-white text-gray-700 border border-gray-100 px-2 py-0.5 rounded shadow-sm">
                                                    {a.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </FormSection>

                            <FormSection icon="sparkles" title={t('details.service_constraints')}>
                                {coupon.is_for_all_services ? (
                                    <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md block text-center">
                                        {t('details.all_services')}
                                    </span>
                                ) : (
                                    <div className="space-y-4">
                                        <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md block text-center">
                                            {t('details.specific_services', { count: coupon.services_count })}
                                        </span>
                                        {coupon.services && coupon.services.length > 0 && (
                                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                                {coupon.services.map((s) => (
                                                    <div key={s.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 space-y-2">
                                                        <h6 className="text-xs font-bold text-gray-800 border-b border-gray-100 pb-1.5">{s.name}</h6>
                                                        
                                                        {/* allowed visit types pivot */}
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">{t('details.allowed_visit_types')}</p>
                                                            {s.pivot?.allowed_visit_types && s.pivot.allowed_visit_types.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {s.pivot.allowed_visit_types.map((vt) => (
                                                                        <span key={vt} className="text-[10px] font-semibold bg-white text-gray-700 px-1.5 py-0.5 rounded border border-gray-100">
                                                                            {vt}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-[10px] text-gray-400 italic">{t('details.no_visit_types')}</p>
                                                            )}
                                                        </div>

                                                        {/* allowed shifts pivot */}
                                                        <div>
                                                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">{t('details.allowed_shifts')}</p>
                                                            {s.pivot?.allowed_shifts && s.pivot.allowed_shifts.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {s.pivot.allowed_shifts.map((sh, sIdx) => (
                                                                        <span key={sIdx} className="text-[10px] font-mono bg-white text-[#E91E63] px-1.5 py-0.5 rounded border border-gray-100 font-bold">
                                                                            {sh.start_time} - {sh.end_time}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-[10px] text-gray-400 italic">{t('details.no_shifts')}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </FormSection>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
