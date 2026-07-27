import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import RowActionsMenu, { EditIcon, TrashIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';

export default function DeparturePoints() {
    const { t, i18n } = useTranslation('common');
    const navigate = useNavigate();
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(id);
    }, [searchInput]);

    const queryString = useMemo(() => {
        const params = new URLSearchParams({ page: String(page), per_page: '15' });
        if (search) params.append('search', search);
        return params.toString();
    }, [page, search]);

    const { data: responseData, isLoading, isError, error } = useQuery({
        queryKey: ['departure-points', queryString],
        queryFn: async () => (await axiosInstance.get(`/admin/departure-points?${queryString}`)).data,
        keepPreviousData: true,
    });

    const points = responseData?.data?.items || [];
    const meta = responseData?.data?.meta;

    const deleteMutation = useMutation({
        mutationFn: (id) => axiosInstance.delete(`/admin/departure-points/${id}`),
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم حذف نقطة الانطلاق بنجاح' : 'Departure point deleted'));
            queryClient.invalidateQueries({ queryKey: ['departure-points'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || (isArabic ? 'حدث خطأ أثناء الحذف' : 'Error deleting departure point'));
        },
    });

    if (isError) return <div className="p-8 text-rose-500 font-bold">{error.message}</div>;

    return (
        <div className="space-y-6 font-main w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'نقاط الانطلاق' : 'Departure Points'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'إدارة نقاط انطلاق وتجمع الحافلات والعاملات (مثل السكنات وفروع الشركة).' : 'Manage departure dormitories and company hub stations.'}
                    </p>
                </div>

                <button
                    onClick={() => navigate('/departure-points/create')}
                    className="bg-[#E91E63] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#D81B60] transition shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto outline-none"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{isArabic ? 'إضافة نقطة انطلاق' : 'Add Departure Point'}</span>
                </button>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
                    <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400 pointer-events-none">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={isArabic ? 'البحث عن نقطة انطلاق...' : 'Search departure points...'}
                        className="w-full border border-gray-200 rounded-lg ps-9 pe-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider ">
                                <th className="py-3.5 px-4 ">{isArabic ? 'اسم النقطة' : 'Point Name'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'العنوان' : 'Address'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'الإحداثيات' : 'Coordinates'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" className="py-12  text-gray-400 font-bold">
                                        <div className="flex justify-center items-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                            <span>{isArabic ? 'جاري التحميل...' : 'Loading...'}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : points.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-12  text-gray-400 font-bold">
                                        {isArabic ? 'لا توجد نقاط انطلاق مضافات بعد.' : 'No departure points added.'}
                                    </td>
                                </tr>
                            ) : (
                                points.map((point) => (
                                    <tr key={point.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                                            <span className="text-lg">📍</span>
                                            <span>{point.name}</span>
                                        </td>
                                        <td className="py-3 px-4  text-gray-600">
                                            {point.address || '—'}
                                        </td>
                                        <td className="py-3 px-4  font-mono text-[11px] text-gray-500">
                                            {point.latitude && point.longitude ? (
                                                <a
                                                    href={`https://maps.google.com/?q=${point.latitude},${point.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[#E91E63] hover:underline"
                                                >
                                                    <span>{point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}</span>
                                                    <span>↗</span>
                                                </a>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="py-3 px-4 ">
                                            <div className="flex justify-center">
                                                <RowActionsMenu
                                                    label={isArabic ? 'إجراءات' : 'Actions'}
                                                    items={[
                                                        {
                                                            key: 'edit',
                                                            label: isArabic ? 'تعديل النقطة' : 'Edit Point',
                                                            icon: <EditIcon />,
                                                            onClick: () => navigate(`/departure-points/${point.id}/edit`),
                                                        },
                                                        {
                                                            key: 'delete',
                                                            label: isArabic ? 'حذف النقطة' : 'Delete Point',
                                                            icon: <TrashIcon />,
                                                            danger: true,
                                                            onClick: () => {
                                                                if (window.confirm(isArabic ? 'هل أنت متأكد من حذف نقطة الانطلاق هذه؟' : 'Delete this departure point?')) {
                                                                    deleteMutation.mutate(point.id);
                                                                }
                                                            },
                                                        },
                                                    ]}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3.5 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <Pagination meta={meta} onPageChange={setPage} />
                </div>
            </div>
        </div>
    );
}
