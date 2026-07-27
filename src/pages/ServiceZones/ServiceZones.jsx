import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import RowActionsMenu, { EditIcon, TrashIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';

export default function ServiceZones() {
    const { i18n } = useTranslation('common');
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
        queryKey: ['service-zones', queryString],
        queryFn: async () => (await axiosInstance.get(`/admin/service-zones?${queryString}`)).data,
        keepPreviousData: true,
    });

    const zones = responseData?.data?.items || [];
    const meta = responseData?.data?.meta;

    const deleteMutation = useMutation({
        mutationFn: (id) => axiosInstance.delete(`/admin/service-zones/${id}`),
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم حذف منطقة التغطية بنجاح' : 'Zone deleted'));
            queryClient.invalidateQueries({ queryKey: ['service-zones'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || (isArabic ? 'حدث خطأ أثناء الحذف' : 'Error deleting zone'));
        },
    });

    if (isError) return <div className="p-8 text-rose-500 font-bold">{error.message}</div>;

    return (
        <div className="space-y-6 font-main w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'مناطق التغطية الجغرافية (Geo-fenced Zones)' : 'Geo-fenced Service Zones'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'رسم مناطق التغطية الجغرافية بالحدود الدقيقة على Google Maps.' : 'Draw interactive polygon service zones on Google Maps.'}
                    </p>
                </div>

                <button
                    onClick={() => navigate('/service-zones/create')}
                    className="bg-[#E91E63] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#D81B60] transition shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto outline-none"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{isArabic ? 'رسم منطقة تغطية جديدة' : 'Draw New Zone'}</span>
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
                        placeholder={isArabic ? 'البحث عن منطقة تغطية...' : 'Search service zones...'}
                        className="w-full border border-gray-200 rounded-lg ps-9 pe-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                <th className="py-3.5 px-4 ">{isArabic ? 'اسم المنطقة' : 'Zone Name'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'المحافظة' : 'Governorate'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'المدينة الوصفية' : 'City'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'نقاط الحدود الجغرافية' : 'Boundary Pins'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'الحالة' : 'Status'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="py-12  text-gray-400 font-bold">
                                        <div className="flex justify-center items-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                            <span>{isArabic ? 'جاري التحميل...' : 'Loading...'}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : zones.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-12  text-gray-400 font-bold">
                                        {isArabic ? 'لا توجد مناطق تغطية مضافة بعد.' : 'No service zones created.'}
                                    </td>
                                </tr>
                            ) : (
                                zones.map((zone) => {
                                    const pinsCount = Array.isArray(zone.polygon_coordinates) ? zone.polygon_coordinates.length : 0;
                                    return (
                                        <tr key={zone.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-3.5 px-4  font-bold text-gray-900 flex items-center gap-2">
                                                <span className="text-base">🗺️</span>
                                                <span>{zone.name}</span>
                                            </td>
                                            <td className="py-3.5 px-4  font-semibold text-gray-700">
                                                {zone.governorate || '—'}
                                            </td>
                                            <td className="py-3.5 px-4  text-gray-600">
                                                {zone.city || '—'}
                                            </td>
                                            <td className="py-3.5 px-4 ">
                                                <span className="px-2.5 py-1 rounded-full bg-pink-50 text-[#E91E63] text-[11px] font-bold border border-pink-100">
                                                    📍 {pinsCount} {isArabic ? 'نقاط مضلع' : 'Boundary Pins'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 ">
                                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                                                    zone.status === 'active'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${zone.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                                    {zone.status === 'active' ? (isArabic ? 'مفعلة' : 'Active') : (isArabic ? 'معطلة' : 'Inactive')}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 ">
                                                <div className="flex justify-center">
                                                    <RowActionsMenu
                                                        label={isArabic ? 'إجراءات' : 'Actions'}
                                                        items={[
                                                            {
                                                                key: 'edit',
                                                                label: isArabic ? 'تعديل الحدود والمنطقة' : 'Edit Zone Polygon',
                                                                icon: <EditIcon />,
                                                                onClick: () => navigate(`/service-zones/${zone.id}/edit`),
                                                            },
                                                            {
                                                                key: 'delete',
                                                                label: isArabic ? 'حذف المنطقة' : 'Delete Zone',
                                                                icon: <TrashIcon />,
                                                                danger: true,
                                                                onClick: () => {
                                                                    if (window.confirm(isArabic ? 'هل أنت متأكد من حذف منطقة التغطية هذه؟' : 'Delete this service zone?')) {
                                                                        deleteMutation.mutate(zone.id);
                                                                    }
                                                                },
                                                            },
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
                    <Pagination meta={meta} onPageChange={setPage} />
                </div>
            </div>
        </div>
    );
}
