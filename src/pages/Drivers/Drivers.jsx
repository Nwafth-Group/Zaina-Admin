import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import RowActionsMenu, { EditIcon, TrashIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';
import { hasPermission } from '../../utils/permissions.js';

const DEFAULT_FILTERS = {
    status: '',
    per_page: 15,
};

export default function Drivers() {
    const { t, i18n } = useTranslation('common');
    const navigate = useNavigate();
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);

    const lastCountsRef = useRef({ all: 0, active: 0, inactive: 0 });

    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(id);
    }, [searchInput]);

    const queryString = useMemo(() => {
        const params = new URLSearchParams({ page: String(page), per_page: String(filters.per_page) });
        if (search) params.append('search', search);
        if (filters.status) params.append('status', filters.status);
        return params.toString();
    }, [page, search, filters]);

    const { data: responseData, isLoading, isError, error } = useQuery({
        queryKey: ['drivers', queryString],
        queryFn: async () => (await axiosInstance.get(`/admin/drivers?${queryString}`)).data,
        keepPreviousData: true,
    });

    const drivers = responseData?.data?.items || [];
    const meta = responseData?.data?.meta;

    if (responseData?.data?.counts) {
        lastCountsRef.current = responseData.data.counts;
    }
    const counts = lastCountsRef.current;

    const deleteMutation = useMutation({
        mutationFn: (id) => axiosInstance.delete(`/admin/drivers/${id}`),
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم حذف السائق بنجاح' : 'Driver deleted successfully'));
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || (isArabic ? 'حدث خطأ أثناء حذف السائق' : 'Error deleting driver'));
        },
    });

    const cardTabs = [
        { key: '', label: isArabic ? 'جميع السائقين' : 'All Drivers', count: counts.all, icon: '🚘', color: 'bg-[#FDF0F3] border-[#fbdbe3]' },
        { key: 'active', label: isArabic ? 'السائقين النشطين' : 'Active Drivers', count: counts.active, icon: '✅', color: 'bg-emerald-50 border-emerald-200' },
        { key: 'inactive', label: isArabic ? 'غير النشطين' : 'Inactive Drivers', count: counts.inactive, icon: '⏸️', color: 'bg-gray-50 border-gray-200' },
    ];

    if (isError) return <div className="p-8 text-rose-500 font-bold">{error.message}</div>;

    return (
        <div className="space-y-6 font-main w-full">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'إدارة سائقين النقل' : 'Drivers Management'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'إدارة بيانات سائقي حافلات التوصيل وتوزيع المهام.' : 'Manage transport drivers, contacts, and active status.'}
                    </p>
                </div>

                <button
                    onClick={() => navigate('/drivers/create')}
                    className="bg-[#E91E63] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#D81B60] transition shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto outline-none"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{isArabic ? 'إضافة سائق جديد' : 'Add New Driver'}</span>
                </button>
            </div>

            {/* Metric Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {cardTabs.map((card) => {
                    const isActive = filters.status === card.key;
                    return (
                        <button
                            key={card.key}
                            onClick={() => {
                                setFilters((f) => ({ ...f, status: card.key }));
                                setPage(1);
                            }}
                            className={`p-4 rounded-xl border  transition-all flex items-center justify-between ${
                                isActive ? `${card.color} ring-2 ring-[#E91E63]/30 shadow-sm` : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div>
                                <p className="text-xs font-bold text-gray-500">{card.label}</p>
                                <p className="text-2xl font-black text-gray-900 mt-1">{card.count ?? 0}</p>
                            </div>
                            <div className="text-2xl">{card.icon}</div>
                        </button>
                    );
                })}
            </div>

            {/* Filter & Toolbar */}
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
                        placeholder={isArabic ? 'البحث عن سائق بالاسم أو الجوال...' : 'Search by name, mobile...'}
                        className="w-full border border-gray-200 rounded-lg ps-9 pe-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full  border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider ">
                                <th className="py-3.5 px-4 ">{isArabic ? 'اسم السائق' : 'Driver Name'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'رقم الجوال' : 'Mobile'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'المركبة واللوحة' : 'Vehicle & Plate'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'البريد الإلكتروني' : 'Email'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'الجنس' : 'Gender'}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'الحالة' : 'Status'}</th>
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
                            ) : drivers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-12  text-gray-400 font-bold">
                                        {isArabic ? 'لا يوجد سائقين مضافين بعد.' : 'No drivers added yet.'}
                                    </td>
                                </tr>
                            ) : (
                                drivers.map((driver) => (
                                    <tr key={driver.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="py-3 px-4  font-bold text-gray-900 flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 font-bold text-xs text-[#E91E63]">
                                                {driver.image ? (
                                                    <img src={driver.image} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    driver.name?.charAt(0)
                                                )}
                                            </div>
                                            <span>{driver.name}</span>
                                        </td>
                                        <td className="py-3 px-4  font-mono font-bold text-gray-700" dir="ltr">
                                            {driver.mobile}
                                        </td>
                                        <td className="py-3 px-4 ">
                                            {driver.vehicle_type || driver.vehicle_plate ? (
                                                <div className="space-y-0.5">
                                                    <div className="font-bold text-gray-800 flex items-center gap-1.5">
                                                        <span>🚐</span>
                                                        <span>{driver.vehicle_type || (isArabic ? 'حافلة نقل' : 'Vehicle')}</span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                                                        {driver.vehicle_plate && (
                                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 font-bold text-gray-700">
                                                                {driver.vehicle_plate}
                                                            </span>
                                                        )}
                                                        <span>👥 {driver.vehicle_capacity || 5} {isArabic ? 'ركاب' : 'seats'}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 font-mono">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4  text-gray-600 font-mono">
                                            {driver.email || '—'}
                                        </td>
                                        <td className="py-3 px-4  font-medium">
                                            {driver.gender === 'male' ? (isArabic ? 'ذكر' : 'Male') : (isArabic ? 'أنثى' : 'Female')}
                                        </td>
                                        <td className="py-3 px-4 ">
                                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                                                driver.status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${driver.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                                {driver.status === 'active' ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Inactive')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 ">
                                            <div className="flex justify-center">
                                                <RowActionsMenu
                                                    label={isArabic ? 'إجراءات' : 'Actions'}
                                                    items={[
                                                        {
                                                            key: 'edit',
                                                            label: isArabic ? 'تعديل السائق' : 'Edit Driver',
                                                            icon: <EditIcon />,
                                                            onClick: () => navigate(`/drivers/${driver.id}/edit`),
                                                        },
                                                        {
                                                            key: 'delete',
                                                            label: isArabic ? 'حذف السائق' : 'Delete Driver',
                                                            icon: <TrashIcon />,
                                                            danger: true,
                                                            onClick: () => {
                                                                if (window.confirm(isArabic ? 'هل أنت متأكد من حذف هذا السائق؟' : 'Are you sure you want to delete this driver?')) {
                                                                    deleteMutation.mutate(driver.id);
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

                {/* Pagination */}
                <div className="p-3.5 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <Pagination meta={meta} onPageChange={setPage} />
                </div>
            </div>
        </div>
    );
}
