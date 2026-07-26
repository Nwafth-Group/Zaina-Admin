import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import Pagination from '../../component/Pagination.jsx';
import { hasPermission } from '../../utils/permissions.js';

export default function Reviews() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const isArabic = i18n.language === 'ar';
    const queryClient = useQueryClient();

    // Filtering states
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
    const [targetType, setTargetType] = useState(''); // '' (all) | 'service' | 'worker'
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [selectedReview, setSelectedReview] = useState(null);

    // Fetch reviews query
    const { data: responseData, isLoading, isFetching } = useQuery({
        queryKey: ['adminReviews', activeTab, targetType, searchQuery, currentPage, perPage],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: currentPage,
                per_page: perPage,
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
        keepPreviousData: true,
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
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'فشل اعتماد التقييم' : 'Failed to approve review'));
        },
    });

    // Reject Mutation
    const rejectMutation = useMutation({
        mutationFn: async (reviewId) => {
            const res = await axiosInstance.post(`/admin/reviews/${reviewId}/reject`);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || (isArabic ? 'تم رفض التقييم بنجاح' : 'Review rejected successfully'));
            queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || (isArabic ? 'فشل رفض التقييم' : 'Failed to reject review'));
        },
    });

    // Helper star renderer
    const renderStars = (rating) => {
        return (
            <div className="flex items-center justify-center gap-1">
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

    // Helper status badge
    const renderStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {isArabic ? 'معتمد' : 'Approved'}
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        {isArabic ? 'مرفوض' : 'Rejected'}
                    </span>
                );
            case 'pending':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        {isArabic ? 'قيد المراجعة' : 'Pending Approval'}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6 font-main w-full">
            {/* Header Title */}
            <div>
                <h1 className="text-xl font-black text-gray-900">
                    {isArabic ? 'إدارة التقييمات' : 'Reviews Management'}
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                    {isArabic ? 'مراجعة واعتماد تقييمات العملاء للخدمات والعاملات قبل ظهورها للعموم' : 'Review and moderate customer feedback for services and workers.'}
                </p>
            </div>

            {/* Summary Metrics & Filter Tabs Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                    type="button"
                    onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
                    className={`p-4 rounded-2xl border text-start transition-all flex items-center justify-between outline-none ${
                        activeTab === 'pending'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                            : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50 shadow-2xs'
                    }`}
                >
                    <div>
                        <p className={`text-[11px] font-bold uppercase tracking-wider ${activeTab === 'pending' ? 'text-amber-100' : 'text-gray-400'}`}>
                            {isArabic ? 'قيد المراجعة' : 'Pending'}
                        </p>
                        <p className="text-2xl font-black mt-1">{counts.pending}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'}`}>
                        ⏳
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => { setActiveTab('approved'); setCurrentPage(1); }}
                    className={`p-4 rounded-2xl border text-start transition-all flex items-center justify-between outline-none ${
                        activeTab === 'approved'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50 shadow-2xs'
                    }`}
                >
                    <div>
                        <p className={`text-[11px] font-bold uppercase tracking-wider ${activeTab === 'approved' ? 'text-emerald-100' : 'text-gray-400'}`}>
                            {isArabic ? 'المعتمدة' : 'Approved'}
                        </p>
                        <p className="text-2xl font-black mt-1">{counts.approved}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${activeTab === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                        ✅
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => { setActiveTab('rejected'); setCurrentPage(1); }}
                    className={`p-4 rounded-2xl border text-start transition-all flex items-center justify-between outline-none ${
                        activeTab === 'rejected'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                            : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50 shadow-2xs'
                    }`}
                >
                    <div>
                        <p className={`text-[11px] font-bold uppercase tracking-wider ${activeTab === 'rejected' ? 'text-rose-100' : 'text-gray-400'}`}>
                            {isArabic ? 'المرفوضة' : 'Rejected'}
                        </p>
                        <p className="text-2xl font-black mt-1">{counts.rejected}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${activeTab === 'rejected' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'}`}>
                        ❌
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
                    className={`p-4 rounded-2xl border text-start transition-all flex items-center justify-between outline-none ${
                        activeTab === 'all'
                            ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                            : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50 shadow-2xs'
                    }`}
                >
                    <div>
                        <p className={`text-[11px] font-bold uppercase tracking-wider ${activeTab === 'all' ? 'text-gray-300' : 'text-gray-400'}`}>
                            {isArabic ? 'الكل' : 'All Reviews'}
                        </p>
                        <p className="text-2xl font-black mt-1">{counts.total}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        ⭐
                    </div>
                </button>
            </div>

            {/* Filter Search Bar */}
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex flex-1 gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            placeholder={isArabic ? 'ابحث باسم العميل، التعليق، رقم الحجز...' : 'Search customer name, comment, booking ref...'}
                            className="w-full pr-9 pl-4 h-10 text-xs border border-gray-200 rounded-xl focus:border-[#E91E63] focus:ring-2 focus:ring-[#E91E63]/10 transition-all outline-none bg-white font-medium text-gray-800"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute right-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                    </div>

                    {/* Target Filter Select */}
                    <select
                        value={targetType}
                        onChange={(e) => { setTargetType(e.target.value); setCurrentPage(1); }}
                        className="px-3.5 h-10 text-xs border border-gray-200 rounded-xl focus:border-[#E91E63] focus:ring-2 focus:ring-[#E91E63]/10 outline-none bg-white font-bold text-gray-700"
                    >
                        <option value="">{isArabic ? 'جميع التقييمات (خدمات وعاملات)' : 'All Targets (Services & Workers)'}</option>
                        <option value="service">{isArabic ? 'تقييمات الخدمات فقط' : 'Service Reviews Only'}</option>
                        <option value="worker">{isArabic ? 'تقييمات العاملات فقط' : 'Worker Reviews Only'}</option>
                    </select>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white border border-gray-100 rounded-3xl shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs border-collapse">
                        <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold border-b border-gray-100 text-[11px]">
                            <tr>
                                <th className="p-4 text-center">{isArabic ? 'العميل' : 'Customer'}</th>
                                <th className="p-4 text-center">{isArabic ? 'الجهة المقيّمة' : 'Evaluated Target'}</th>
                                <th className="p-4 text-center">{isArabic ? 'التقييم' : 'Rating'}</th>
                                <th className="p-4 text-center">{isArabic ? 'التعليق' : 'Comment'}</th>
                                <th className="p-4 text-center">{isArabic ? 'الحالة' : 'Status'}</th>
                                <th className="p-4 text-center">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading || isFetching ? (
                                <tr>
                                    <td colSpan="6" className="p-16 text-center text-xs text-gray-400 font-medium">
                                        {isArabic ? 'جاري تحميل التقييمات...' : 'Loading reviews...'}
                                    </td>
                                </tr>
                            ) : reviewsList.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-16 text-center text-xs text-gray-400 font-medium">
                                        {isArabic ? 'لا توجد تقييمات تنطبق على الفلاتر المحددة.' : 'No reviews match the selected filters.'}
                                    </td>
                                </tr>
                            ) : (
                                reviewsList.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50/60 transition-colors bg-white">
                                        {/* Customer */}
                                        <td className="p-4 text-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-[#FDF0F3] border border-pink-100 text-[#E91E63] font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                                                    {row.customer?.first_name?.charAt(0) || 'C'}
                                                </div>
                                                <div className="min-w-0 text-start">
                                                    {row.customer?.id ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/clients/${row.customer.id}`)}
                                                            className="text-xs font-extrabold text-gray-900 hover:text-[#E91E63] hover:underline truncate block outline-none"
                                                        >
                                                            {row.customer ? `${row.customer.first_name} ${row.customer.last_name || ''}` : '-'}
                                                        </button>
                                                    ) : (
                                                        <p className="text-xs font-extrabold text-gray-900 truncate">
                                                            {row.customer ? `${row.customer.first_name} ${row.customer.last_name || ''}` : '-'}
                                                        </p>
                                                    )}
                                                    <p className="text-[11px] text-gray-400 font-medium truncate" dir="ltr">{row.customer?.phone || row.customer?.email || ''}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Evaluated Target */}
                                        <td className="p-4 text-start">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${row.target_type === 'service' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>
                                                    {row.target_type === 'service' ? (isArabic ? 'خدمة' : 'Service') : (isArabic ? 'عاملة' : 'Worker')}
                                                </span>
                                                <span className="text-xs font-bold text-gray-800 truncate max-w-[180px]">
                                                    {row.target?.name || '-'}
                                                </span>
                                            </div>
                                            {row.booking_ref && (
                                                <div className="mt-1 text-start">
                                                    {row.booking_id ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/bookings/${row.booking_id}`)}
                                                            className="text-[11px] font-bold text-[#E91E63] hover:underline outline-none"
                                                        >
                                                            #{row.booking_ref}
                                                        </button>
                                                    ) : (
                                                        <span className="text-[11px] font-medium text-gray-400">#{row.booking_ref}</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* Rating */}
                                        <td className="p-4 text-center">
                                            {renderStars(row.rating)}
                                        </td>

                                        {/* Comment */}
                                        <td className="p-4 text-start">
                                            <div className="max-w-[280px]">
                                                <p className="text-xs font-medium text-gray-700 truncate cursor-pointer hover:text-gray-900" onClick={() => setSelectedReview(row)}>
                                                    {row.comment ? `"${row.comment}"` : <span className="text-gray-400 italic">{isArabic ? 'بدون تعليق مكتوب' : 'No written comment'}</span>}
                                                </p>
                                                <p className="text-[10px] font-medium text-gray-400 mt-0.5">{row.created_since || row.created_at}</p>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="p-4 text-center">
                                            {renderStatusBadge(row.status)}
                                        </td>

                                        {/* Action Buttons */}
                                        <td className="p-4 text-center">
                                            {hasPermission('reviews.edit') ? (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {row.status !== 'approved' && (
                                                        <button
                                                            type="button"
                                                            disabled={approveMutation.isPending}
                                                            onClick={() => approveMutation.mutate(row.id)}
                                                            className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition disabled:opacity-50 outline-none"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                            </svg>
                                                            <span>{isArabic ? 'اعتماد' : 'Approve'}</span>
                                                        </button>
                                                    )}
                                                    {row.status !== 'rejected' && (
                                                        <button
                                                            type="button"
                                                            disabled={rejectMutation.isPending}
                                                            onClick={() => rejectMutation.mutate(row.id)}
                                                            className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition disabled:opacity-50 outline-none"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                            <span>{isArabic ? 'رفض' : 'Reject'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-400 font-semibold">{isArabic ? 'عرض فقط' : 'View Only'}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {meta.last_page > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={meta.last_page}
                    onPageChange={(p) => setCurrentPage(p)}
                />
            )}

            {/* Comment Detail Modal */}
            {selectedReview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-extrabold text-gray-900">
                                {isArabic ? 'تفاصيل التقييم' : 'Review Details'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSelectedReview(null)}
                                className="text-gray-400 hover:text-gray-600 text-sm font-bold outline-none"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{isArabic ? 'العميل' : 'Customer'}</p>
                                <p className="text-sm font-extrabold text-gray-900 mt-0.5">
                                    {selectedReview.customer ? `${selectedReview.customer.first_name} ${selectedReview.customer.last_name || ''}` : '-'}
                                </p>
                                <p className="text-xs text-gray-400 font-medium" dir="ltr">{selectedReview.customer?.phone || selectedReview.customer?.email || ''}</p>
                            </div>

                            <div className="flex justify-between items-center bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{isArabic ? 'الجهة المقيّمة' : 'Target'}</p>
                                    <p className="text-xs font-extrabold text-gray-900 mt-0.5">{selectedReview.target?.name || '-'}</p>
                                </div>
                                {renderStars(selectedReview.rating)}
                            </div>

                            <div>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{isArabic ? 'محتوى التعليق' : 'Review Comment'}</p>
                                <p className="text-xs font-medium text-gray-700 bg-pink-50/30 p-4 rounded-2xl border border-pink-100/50 italic leading-relaxed">
                                    {selectedReview.comment ? `"${selectedReview.comment}"` : (isArabic ? 'بدون تعليق مكتوب' : 'No written comment')}
                                </p>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-gray-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedReview(null)}
                                className="px-4 py-2 text-xs rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
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
