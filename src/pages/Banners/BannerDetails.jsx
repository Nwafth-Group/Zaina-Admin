import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { hasPermission } from '../../utils/permissions.js';

const InfoItem = ({ label, value, highlight = false, badge = false, badgeBg = 'bg-gray-100 text-gray-700' }) => (
    <div className="flex items-start justify-between gap-3 p-3.5 bg-gray-50/60 hover:bg-gray-50 border border-gray-100 rounded-2xl transition-colors">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        {badge ? (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${badgeBg}`}>
                {value}
            </span>
        ) : (
            <span className={`text-xs ${highlight ? 'font-black text-[#E91E63]' : 'font-bold text-gray-800'} text-end truncate max-w-[220px]`}>
                {value ?? '—'}
            </span>
        )}
    </div>
);

export default function BannerDetails() {
    const { id: bannerId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation('banners');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    // Fetch banner detail query
    const { data: banner, isLoading, isError } = useQuery({
        queryKey: ['bannerDetail', bannerId],
        queryFn: async () => (await axiosInstance.get(`/admin/ads/${bannerId}`)).data.data,
        enabled: !!bannerId,
    });

    // Toggle status mutation
    const toggleStatusMutation = useMutation({
        mutationFn: async () => {
            const payload = new FormData();
            payload.append('_method', 'PUT');
            payload.append('title_en', banner.title_en);
            payload.append('title_ar', banner.title_ar);
            payload.append('status', banner.status === 'active' ? 'inactive' : 'active');
            return axiosInstance.post(`/admin/ads/${bannerId}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم تغيير حالة الإعلان' : 'Banner status updated'));
            queryClient.invalidateQueries({ queryKey: ['bannerDetail', bannerId] });
            queryClient.invalidateQueries({ queryKey: ['banners'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || (isArabic ? 'فشل تغيير الحالة' : 'Failed to update status'));
        },
    });

    return (
        <div className="space-y-6 font-main max-w-7xl mx-auto pb-12">
            {/* Top Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-2xs">
                <div>
                    <button
                        onClick={() => navigate('/banners')}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#E91E63] transition-colors mb-1.5 outline-none group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        <span>{isArabic ? 'العودة للإعلانات البنريّة' : 'Back to Banners'}</span>
                    </button>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'تفاصيل البنر الإعلاني' : 'Banner Details'}
                    </h2>
                </div>

                {banner && hasPermission('banners.edit') && (
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => navigate(`/banners/${bannerId}/edit`)}
                            className="px-4 h-10 rounded-xl text-xs font-bold bg-[#E91E63] text-white hover:bg-[#D81B60] transition-colors shadow-2xs flex items-center gap-2 outline-none"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                            </svg>
                            <span>{isArabic ? 'تعديل البنر' : 'Edit Banner'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleStatusMutation.mutate()}
                            disabled={toggleStatusMutation.isPending}
                            className={`px-4 h-10 rounded-xl text-xs font-bold border active:scale-95 transition-all flex items-center gap-2 outline-none ${
                                banner.status === 'active'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                        >
                            <span>
                                {banner.status === 'active'
                                    ? (isArabic ? 'تعطيل البنر' : 'Deactivate')
                                    : (isArabic ? 'تفعيل البنر' : 'Activate')}
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
                    <p className="font-bold text-sm text-gray-600">{isArabic ? 'جاري تحميل تفاصيل البنر...' : 'Loading banner details...'}</p>
                </div>
            ) : isError || !banner ? (
                <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-16 text-center text-rose-600 font-bold">
                    {isArabic ? 'حدث خطأ أثناء تحميل تفاصيل البنر.' : 'Error loading banner details.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Banner Visual Preview Card */}
                    <div className="lg:col-span-2 bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 space-y-4">
                        <h3 className="text-sm font-extrabold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                            <span>{isArabic ? 'معاينة البنر الإعلاني' : 'Banner Visual Preview'}</span>
                        </h3>

                        <div className="relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center min-h-[260px]">
                            {banner.image ? (
                                <img
                                    src={banner.image}
                                    alt={banner.title_en || banner.title_ar}
                                    className="w-full h-auto max-h-[420px] object-cover rounded-2xl"
                                />
                            ) : (
                                <div className="text-center text-gray-400 py-12">
                                    <svg className="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                    </svg>
                                    <p className="font-bold text-xs">{isArabic ? 'لا تتوفر صورة لهذا البنر' : 'No image uploaded for this banner'}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata Specs Card */}
                    <div className="bg-white rounded-3xl shadow-2xs border border-gray-100 p-6 space-y-4">
                        <h3 className="text-sm font-extrabold text-gray-900 pb-3 border-b border-gray-100 flex items-center gap-2">
                            <svg className="w-4 h-4 text-[#E91E63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                            <span>{isArabic ? 'بيانات ومواصفات البنر' : 'Banner Information'}</span>
                        </h3>

                        <div className="space-y-3">
                            <InfoItem label={isArabic ? 'العنوان بالعربية' : 'Arabic Title'} value={banner.title_ar} />
                            <InfoItem label={isArabic ? 'العنوان بالإنجليزية' : 'English Title'} value={banner.title_en} />
                            <InfoItem
                                label={isArabic ? 'حالة البنر' : 'Status'}
                                value={banner.status === 'active' ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Inactive')}
                                badge
                                badgeBg={banner.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}
                            />
                            {banner.created_at && (
                                <InfoItem label={isArabic ? 'تاريخ الإنشاء' : 'Created At'} value={banner.created_at?.substring(0, 10)} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
