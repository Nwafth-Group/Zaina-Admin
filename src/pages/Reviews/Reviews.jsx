import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import Pagination from '../../component/Pagination.jsx';
import RowActionsMenu, { EyeIcon } from '../../component/RowActionsMenu.jsx';
import { hasPermission } from '../../utils/permissions.js';

const STATUS_TABS = [
    { value: 'all', label: 'الجميع', labelEn: 'All', color: 'bg-[#FDF0F3] border-[#fbdbe3]', icon: '⭐', countKey: 'total' },
    { value: 'pending', label: 'بانتظار الاعتماد', labelEn: 'Pending Approval', color: 'bg-amber-50 border-amber-200', icon: '⏳', countKey: 'pending' },
    { value: 'approved', label: 'معتمدة', labelEn: 'Approved', color: 'bg-emerald-50 border-emerald-200', icon: '✅', countKey: 'approved' },
    { value: 'rejected', label: 'مرفوضة', labelEn: 'Rejected', color: 'bg-rose-50 border-rose-200', icon: '❌', countKey: 'rejected' },
];

export default function Reviews() {
    const { i18n } = useTranslation();
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    // Filtering states
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
    const [targetType, setTargetType] = useState(''); // '' (all) | 'service' | 'worker'
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(15);
    const [selectedReview, setSelectedReview] = useState(null);

    // Fetch reviews query
    const { data: responseData, isLoading, isError, error } = useQuery({
        queryKey: ['adminReviews', activeTab, targetType, searchQuery, currentPage, perPage],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: String(currentPage),
                per_page: String(perPage),
            });

            if (activeTab !== 'all') {
                params.append('status', activeTab);
            }
            if (targetType) {
                params.append('type', targetType);
            }
            if (searchQuery.trim()) {
                params.append('search', searchQuery.trim());
            }

            const res = await axiosInstance.get(`/admin/reviews?${params.toString()}`);
            return res.data.data;
        },
    });

    const reviewsList = responseData?.items || [];
    const counts = responseData?.counts || { total: 0, pending: 0, approved: 0, rejected: 0 };
    const meta = responseData?.meta || { current_page: 1, last_page: 1, per_page: 15, total: 0 };

    // Approve Mutation
    const approveMutation = useMutation({
        mutationFn: async (reviewId) => {
            const res = await axiosInstance.post(`/admin/reviews/${reviewId}/approve`);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || (isArabic ? 'تم اعتماد التقييم بنجاح' : 'Review approved successfully'));
            queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
            setSelectedReview(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'فشل اعتماد التقييم' : 'Failed to approve review'));
        },
    });

    // Reject Mutation
    const rejectMutation = useMutation({
        mutationFn: async (arg) => {
            const reviewId = typeof arg === 'object' && arg !== null ? arg.reviewId : arg;
            const reason = typeof arg === 'object' && arg !== null ? arg.reason : undefined;
            const res = await axiosInstance.post(`/admin/reviews/${reviewId}/reject`, { reason });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || (isArabic ? 'تم رفض التقييم بنجاح' : 'Review rejected successfully'));
            queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
            setSelectedReview(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'فشل رفض التقييم' : 'Failed to reject review'));
        },
    });

    // Helper star renderer
    const renderStars = (rating) => {
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        className={`w-3.5 h-3.5 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
                <span className="text-xs font-black text-amber-700 font-mono ms-1">({rating})</span>
            </div>
        );
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {isArabic ? 'معتمَد' : 'Approved'}
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        {isArabic ? 'مرفوض' : 'Rejected'}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {isArabic ? 'قيد المراجعة' : 'Pending'}
                    </span>
                );
        }
    };

    if (isError) return <div className="p-8 text-rose-500 font-bold">{error.message}</div>;

    return (
        <div className="space-y-6 font-main w-full">
            {/* Header */}
            <div>
                <h1 className="text-xl font-black text-gray-900 tracking-tight">
                    {isArabic ? 'إدارة تقييمات العملاء' : 'Customer Reviews & Ratings'}
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                    {isArabic ? 'متابعة واعتماد أو رفض تقييمات العملاء للخدمات والعمالة وضمان الجودة' : 'Review, approve, or reject customer ratings for services and workers.'}
                </p>
            </div>

            {/* Summary Metric Tab Cards (Matching Drivers Layout & Colors) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {STATUS_TABS.map((card) => {
                    const isActive = activeTab === card.value;
                    const countVal = counts[card.countKey] || 0;

                    return (
                        <button
                            key={card.value}
                            type="button"
                            onClick={() => {
                                setActiveTab(card.value);
                                setCurrentPage(1);
                            }}
                            className={`p-4 rounded-xl border  transition-all flex items-center justify-between outline-none ${
                                isActive
                                    ? `${card.color} ring-2 ring-[#E91E63]/30 shadow-sm`
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div>
                                <p className="text-xs font-bold text-gray-500">{isArabic ? card.label : card.labelEn}</p>
                                <p className="text-2xl font-black text-gray-900 mt-1">{countVal}</p>
                            </div>
                            <div className="text-2xl">{card.icon}</div>
                        </button>
                    );
                })}
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
                    <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400 pointer-events-none">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder={isArabic ? 'البحث في التعليقات أو العميل...' : 'Search review text or customer...'}
                        className="w-full border border-gray-200 rounded-lg ps-9 pe-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select
                        value={targetType}
                        onChange={(e) => {
                            setTargetType(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 bg-white focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                    >
                        <option value="">{isArabic ? 'جميع أنواع التقييمات' : 'All Target Types'}</option>
                        <option value="service">{isArabic ? 'تقييمات الخدمات' : 'Service Reviews'}</option>
                        <option value="worker">{isArabic ? 'تقييمات العمالة' : 'Worker Reviews'}</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full  border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                <th className="py-3.5 px-4 ">{isArabic ? 'العميل' : 'Customer'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'الهدف المُقيَّم' : 'Target Item'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'التقييم' : 'Rating'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'التعليق' : 'Comment'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'الحالة' : 'Status'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'التاريخ' : 'Date'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="py-12  text-gray-400 font-bold">
                                        <div className="flex justify-center items-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                            <span>{isArabic ? 'جاري التحميل...' : 'Loading...'}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : reviewsList.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-12  text-gray-400 font-bold">
                                        {isArabic ? 'لا توجد تقييمات مطابقة للفلاتر الحالية.' : 'No reviews match selected filters.'}
                                    </td>
                                </tr>
                            ) : (
                                reviewsList.map((item) => {
                                    const isService = item.target_type === 'service' || item.reviewable_type?.includes('Service');
                                    const targetName = isService
                                        ? (isArabic ? item.target?.name_ar : item.target?.name_en) || item.target?.name || 'خدمة'
                                        : item.target?.name || 'عامل/عاملة';
                                    const customerDisplayName = item.customer?.name || item.customer_name || 'عميل';
                                    const customerPhone = item.customer?.mobile || item.customer?.phone || '';

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-3.5 px-4  font-bold text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-pink-100 text-[#E91E63] font-black text-xs flex items-center justify-center">
                                                        {customerDisplayName.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{customerDisplayName}</p>
                                                        {customerPhone && (
                                                            <p className="text-[10px] text-gray-400 font-mono">{customerPhone}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4 ">
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                                    isService ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                                                }`}>
                                                    {isService ? '🛠️ ' : '👩‍🍳 '} {targetName}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4 ">
                                                {renderStars(item.rating)}
                                            </td>

                                            <td className="py-3.5 px-4  max-w-xs truncate text-gray-700 font-medium" title={item.comment}>
                                                {item.comment || '—'}
                                            </td>

                                            <td className="py-3.5 px-4 ">
                                                {getStatusBadge(item.status)}
                                            </td>

                                            <td className="py-3.5 px-4  text-gray-500 font-mono text-[11px]">
                                                {item.created_since || (item.created_at ? new Date(item.created_at.replace(' ', 'T')).toLocaleDateString('ar-EG') : '—')}
                                            </td>

                                            <td className="py-3.5 px-4 ">
                                                <div className="flex justify-center">
                                                    <RowActionsMenu
                                                        label={isArabic ? 'إجراءات' : 'Actions'}
                                                        items={[
                                                            {
                                                                key: 'view',
                                                                label: isArabic ? 'عرض التفاصيل' : 'View Details',
                                                                icon: <EyeIcon />,
                                                                onClick: () => setSelectedReview(item),
                                                            },
                                                            ...(hasPermission('reviews.edit') && item.status !== 'approved'
                                                                ? [
                                                                      {
                                                                          key: 'approve',
                                                                          label: isArabic ? 'اعتماد التقييم' : 'Approve Review',
                                                                          icon: <span className="text-emerald-600 font-bold">✓</span>,
                                                                          onClick: () => approveMutation.mutate(item.id),
                                                                      },
                                                                  ]
                                                                : []),
                                                            ...(hasPermission('reviews.edit') && item.status !== 'rejected'
                                                                ? [
                                                                      {
                                                                          key: 'reject',
                                                                          label: isArabic ? 'رفض التقييم' : 'Reject Review',
                                                                          icon: <span className="text-rose-600 font-bold">✕</span>,
                                                                          danger: true,
                                                                          onClick: () => rejectMutation.mutate(item.id),
                                                                      },
                                                                  ]
                                                                : []),
                                                        ]}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-3.5 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <Pagination meta={meta} onPageChange={setCurrentPage} />
                </div>
            </div>

            {/* Review Details Modal */}
            {selectedReview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-6 border border-gray-200 shadow-xl space-y-4 font-main">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <h3 className="text-base font-black text-gray-900">
                                {isArabic ? 'تفاصيل التقييم' : 'Review Details'}
                            </h3>
                            <button
                                onClick={() => setSelectedReview(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500 font-bold">{isArabic ? 'العميل:' : 'Customer:'}</span>
                                <div className="text-end">
                                    <span className="font-extrabold text-gray-900 block">{selectedReview.customer?.name || selectedReview.customer_name || '—'}</span>
                                    {(selectedReview.customer?.mobile || selectedReview.customer?.phone) && (
                                        <span className="text-[11px] text-gray-400 font-mono">{selectedReview.customer?.mobile || selectedReview.customer?.phone}</span>
                                    )}
                                </div>
                            </div>

                            {selectedReview.booking_ref && (
                                <div className="flex justify-between py-1 border-b border-gray-50">
                                    <span className="text-gray-500 font-bold">{isArabic ? 'رقم الحجز:' : 'Booking Ref:'}</span>
                                    <span className="font-extrabold text-[#E91E63] font-mono">{selectedReview.booking_ref}</span>
                                </div>
                            )}

                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500 font-bold">{isArabic ? 'الهدف المُقيَّم:' : 'Target Item:'}</span>
                                <span className="font-extrabold text-gray-900">
                                    {selectedReview.target?.name_ar || selectedReview.target?.name || '—'}
                                </span>
                            </div>

                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500 font-bold">{isArabic ? 'التقييم:' : 'Rating:'}</span>
                                <div>{renderStars(selectedReview.rating)}</div>
                            </div>

                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-500 font-bold">{isArabic ? 'الحالة الحالية:' : 'Current Status:'}</span>
                                <div>{getStatusBadge(selectedReview.status)}</div>
                            </div>

                            <div className="pt-2">
                                <span className="block text-gray-500 font-bold mb-1">{isArabic ? 'تعليق العميل:' : 'Customer Comment:'}</span>
                                <p className="p-3 bg-gray-50 rounded-xl text-gray-800 font-medium leading-relaxed border border-gray-100">
                                    {selectedReview.comment || (isArabic ? 'لا يوجد تعليق مكتوب.' : 'No comment provided.')}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                            {hasPermission('reviews.edit') && selectedReview.status !== 'approved' && (
                                <button
                                    onClick={() => approveMutation.mutate(selectedReview.id)}
                                    disabled={approveMutation.isPending}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                    {isArabic ? 'اعتماد التقييم' : 'Approve'}
                                </button>
                            )}
                            {hasPermission('reviews.edit') && selectedReview.status !== 'rejected' && (
                                <button
                                    onClick={() => rejectMutation.mutate(selectedReview.id)}
                                    disabled={rejectMutation.isPending}
                                    className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition disabled:opacity-50"
                                >
                                    {isArabic ? 'رفض التقييم' : 'Reject'}
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedReview(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                            >
                                {isArabic ? 'إغلاق' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
