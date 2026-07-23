import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import Pagination from '../../component/Pagination.jsx';
import { hasPermission } from '../../utils/permissions.js';

export default function Reviews() {
    const { t, i18n } = useTranslation();
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
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        className={`w-4 h-4 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
                <span className="text-xs font-bold text-gray-700 ml-1">({rating}/5)</span>
            </div>
        );
    };

    // Helper status badge
    const renderStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {isArabic ? 'معتمد' : 'Approved'}
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        {isArabic ? 'مرفوض' : 'Rejected'}
                    </span>
                );
            case 'pending':
            default:
                return (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        {isArabic ? 'قيد المراجعة' : 'Pending Approval'}
                    </span>
                );
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-black text-gray-900">
                    {isArabic ? 'إدارة التقييمات' : 'Reviews Management'}
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                    {isArabic ? 'مراجعة واعتماد تقييمات العملاء للخدمات والعاملات قبل ظهورها للعموم' : 'Review and approve customer ratings and comments before public display.'}
                </p>
            </div>

            {/* Summary Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                    type="button"
                    onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
                    className={`p-4 rounded-xl border text-right transition flex items-center justify-between ${activeTab === 'pending' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                    <div>
                        <p className={`text-xs font-bold ${activeTab === 'pending' ? 'text-amber-100' : 'text-gray-400'}`}>
                            {isArabic ? 'في انتظار الاعتماد' : 'Pending Approval'}
                        </p>
                        <p className="text-2xl font-black mt-1">{counts.pending}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'}`}>
                        ⏳
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => { setActiveTab('approved'); setCurrentPage(1); }}
                    className={`p-4 rounded-xl border text-right transition flex items-center justify-between ${activeTab === 'approved' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                    <div>
                        <p className={`text-xs font-bold ${activeTab === 'approved' ? 'text-emerald-100' : 'text-gray-400'}`}>
                            {isArabic ? 'المعتمدة' : 'Approved'}
                        </p>
                        <p className="text-2xl font-black mt-1">{counts.approved}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${activeTab === 'approved' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                        ✅
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => { setActiveTab('rejected'); setCurrentPage(1); }}
                    className={`p-4 rounded-xl border text-right transition flex items-center justify-between ${activeTab === 'rejected' ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                    <div>
                        <p className={`text-xs font-bold ${activeTab === 'rejected' ? 'text-rose-100' : 'text-gray-400'}`}>
                            {isArabic ? 'المرفوضة' : 'Rejected'}
                        </p>
                        <p className="text-2xl font-black mt-1">{counts.rejected}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${activeTab === 'rejected' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'}`}>
                        ❌
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
                    className={`p-4 rounded-xl border text-right transition flex items-center justify-between ${activeTab === 'all' ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                >
                    <div>
                        <p className={`text-xs font-bold ${activeTab === 'all' ? 'text-gray-300' : 'text-gray-400'}`}>
                            {isArabic ? 'جميع التقييمات' : 'All Reviews'}
                        </p>
                        <p className="text-2xl font-black mt-1">{counts.total}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        ⭐
                    </div>
                </button>
            </div>

            {/* Filter controls bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            placeholder={isArabic ? 'ابحث باسم العميل، التعليق، رقم الحجز...' : 'Search customer name, comment, booking ref...'}
                            className="w-full pr-9 pl-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#E91E63]"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                    </div>

                    {/* Target Type Filter */}
                    <select
                        value={targetType}
                        onChange={(e) => { setTargetType(e.target.value); setCurrentPage(1); }}
                        className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#E91E63] bg-white"
                    >
                        <option value="">{isArabic ? 'جميع الفئات (خدمات وعاملات)' : 'All Targets (Services & Workers)'}</option>
                        <option value="service">{isArabic ? 'تقييمات الخدمات فقط' : 'Service Reviews Only'}</option>
                        <option value="worker">{isArabic ? 'تقييمات العاملات فقط' : 'Worker Reviews Only'}</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">
                                <th className="py-3.5 px-4 text-center">{isArabic ? 'العميل' : 'Customer'}</th>
                                <th className="py-3.5 px-4 text-center">{isArabic ? 'الجهة المقيّمة' : 'Evaluated Target'}</th>
                                <th className="py-3.5 px-4 text-center">{isArabic ? 'التقييم' : 'Rating'}</th>
                                <th className="py-3.5 px-4 text-center">{isArabic ? 'الملاحظات / التعليق' : 'Comment / Review'}</th>
                                <th className="py-3.5 px-4 text-center">{isArabic ? 'الحالة' : 'Status'}</th>
                                <th className="py-3.5 px-4 text-center">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading || isFetching ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-xs text-gray-400">
                                        {isArabic ? 'جاري تحميل التقييمات...' : 'Loading reviews...'}
                                    </td>
                                </tr>
                            ) : reviewsList.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-xs text-gray-400">
                                        {isArabic ? 'لا توجد تقييمات تنطبق على الفلاتر المحددة.' : 'No reviews match the selected filters.'}
                                    </td>
                                </tr>
                            ) : (
                                reviewsList.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50/50 transition text-center">
                                        {/* Customer */}
                                        <td className="py-3.5 px-4 text-center">
                                            <div className="flex items-center justify-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-[#E91E63]/10 text-[#E91E63] font-bold flex items-center justify-center text-xs">
                                                    {row.customer?.first_name?.charAt(0) || 'C'}
                                                </div>
                                                <div className="text-right rtl:text-right ltr:text-left">
                                                    <p className="text-xs font-bold text-gray-800">
                                                        {row.customer ? `${row.customer.first_name} ${row.customer.last_name || ''}` : '-'}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">{row.customer?.phone || row.customer?.email || ''}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Target */}
                                        <td className="py-3.5 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${row.target_type === 'service' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>
                                                    {row.target_type === 'service' ? (isArabic ? 'خدمة' : 'Service') : (isArabic ? 'عاملة' : 'Worker')}
                                                </span>
                                                <span className="text-xs font-bold text-gray-800 truncate max-w-[180px]">
                                                    {row.target?.name || '-'}
                                                </span>
                                            </div>
                                            {row.booking_ref && (
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {isArabic ? 'حجز: ' : 'Ref: '}{row.booking_ref}
                                                </p>
                                            )}
                                        </td>

                                        {/* Rating */}
                                        <td className="py-3.5 px-4 text-center">
                                            <div className="flex items-center justify-center">
                                                {renderStars(row.rating)}
                                            </div>
                                        </td>

                                        {/* Comment */}
                                        <td className="py-3.5 px-4 text-center">
                                            <div className="max-w-[280px] mx-auto text-center">
                                                <p className="text-xs text-gray-700 truncate cursor-pointer hover:text-gray-900" onClick={() => setSelectedReview(row)}>
                                                    {row.comment ? `"${row.comment}"` : <span className="text-gray-400 italic">{isArabic ? 'بدون تعليق مكتوب' : 'No written comment'}</span>}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{row.created_since || row.created_at}</p>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="py-3.5 px-4 text-center">
                                            {renderStatusBadge(row.status)}
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3.5 px-4 text-center">
                                            {hasPermission('reviews.edit') ? (
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {row.status !== 'approved' && (
                                                        <button
                                                            type="button"
                                                            disabled={approveMutation.isPending}
                                                            onClick={() => approveMutation.mutate(row.id)}
                                                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                            </svg>
                                                            {isArabic ? 'اعتماد' : 'Approve'}
                                                        </button>
                                                    )}
                                                    {row.status !== 'rejected' && (
                                                        <button
                                                            type="button"
                                                            disabled={rejectMutation.isPending}
                                                            onClick={() => rejectMutation.mutate(row.id)}
                                                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition disabled:opacity-50"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                            {isArabic ? 'رفض' : 'Reject'}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-bold text-gray-800">
                                {isArabic ? 'تفاصيل التقييم' : 'Review Details'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSelectedReview(null)}
                                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase">{isArabic ? 'العميل' : 'Customer'}</p>
                                <p className="text-sm font-bold text-gray-800">
                                    {selectedReview.customer ? `${selectedReview.customer.first_name} ${selectedReview.customer.last_name || ''}` : '-'}
                                </p>
                                <p className="text-xs text-gray-400">{selectedReview.customer?.phone || selectedReview.customer?.email || ''}</p>
                            </div>

                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{isArabic ? 'الهدف' : 'Target'}</p>
                                    <p className="text-xs font-bold text-gray-800">{selectedReview.target?.name}</p>
                                </div>
                                {renderStars(selectedReview.rating)}
                            </div>

                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1">{isArabic ? 'الملاحظات / التعليق' : 'Comment'}</p>
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-700 leading-relaxed max-h-40 overflow-y-auto">
                                    {selectedReview.comment || (isArabic ? 'بدون تعليق مكتوب.' : 'No written comment.')}
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                                <span>{isArabic ? 'تاريخ التقديم:' : 'Submitted:'} {selectedReview.created_since || selectedReview.created_at}</span>
                                {renderStatusBadge(selectedReview.status)}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            {selectedReview.status !== 'approved' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        approveMutation.mutate(selectedReview.id);
                                        setSelectedReview(null);
                                    }}
                                    className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition shadow-sm"
                                >
                                    {isArabic ? 'اعتماد التقييم' : 'Approve Review'}
                                </button>
                            )}
                            {selectedReview.status !== 'rejected' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        rejectMutation.mutate(selectedReview.id);
                                        setSelectedReview(null);
                                    }}
                                    className="px-4 py-2 text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-100 transition"
                                >
                                    {isArabic ? 'رفض التقييم' : 'Reject Review'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
