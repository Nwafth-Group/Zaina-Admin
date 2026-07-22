import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import GovernorateActionModal from './GovernorateActionModal';
import LocationHeader from './LocationHeader.jsx';
import RowActionsMenu, { EditIcon, ToggleIcon, TrashIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';
import usePagedList from '../../hooks/usePagedList.js';
import { hasPermission } from '../../utils/permissions.js';

export default function Governorates() {
    const { t, i18n } = useTranslation('locations');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();
    const [modal, setModal] = useState({ open: false, governorate: null });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('');

    // Fetch Countries for Filter
    const { data: countries = [] } = useQuery({
        queryKey: ['countries'],
        queryFn: async () => (await axiosInstance.get('/admin/countries')).data.data.items || [],
    });

    // Fetch Governorates
    const { data: responseData, isLoading, isError, error } = useQuery({
        queryKey: ['govrenrates', selectedCountry],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedCountry) params.append('country_id', selectedCountry);
            params.append('all', 'true');
            const res = await axiosInstance.get(`/admin/govrenrates?${params.toString()}`);
            return res.data.data.items || [];
        },
    });

    const governoratesList = Array.isArray(responseData) ? responseData : [];

    // Filter by search query locally
    const filteredGovernorates = governoratesList.filter((gov) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            gov.name_ar?.toLowerCase().includes(q) ||
            gov.name_en?.toLowerCase().includes(q) ||
            gov.country?.name_ar?.toLowerCase().includes(q) ||
            gov.country?.name_en?.toLowerCase().includes(q)
        );
    });

    const { items, meta, setPage } = usePagedList(filteredGovernorates, 10);
    const nameOf = (obj) => (obj ? (isArabic ? obj.name_ar : obj.name_en) : '—');

    // Toggle Status Mutation
    const toggle = useMutation({
        mutationFn: (id) => axiosInstance.post(`/admin/govrenrates/${id}/toggle-status`),
        onSuccess: () => {
            toast.success(isArabic ? 'تم تغيير حالة المحافظة بنجاح' : 'Status toggled successfully');
            queryClient.invalidateQueries({ queryKey: ['govrenrates'] });
        },
        onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: (id) => axiosInstance.delete(`/admin/govrenrates/${id}`),
        onSuccess: () => {
            toast.success(isArabic ? 'تم حذف المحافظة بنجاح' : 'Governorate deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['govrenrates'] });
        },
        onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
    });

    if (isError) {
        return (
            <div>
                <LocationHeader title={isArabic ? 'إدارة المحافظات' : 'Governorates Management'} />
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-red-500 font-bold">
                    {error.response?.status === 403 ? t('common.forbidden') : error.message}
                </div>
            </div>
        );
    }

    return (
        <div>
            <LocationHeader title={isArabic ? 'إدارة المحافظات' : 'Governorates Management'} />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[60vh]">
                {/* Header & Filter Controls */}
                <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-800">
                            {isArabic ? 'قائمة المحافظات' : 'Governorates List'}
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">
                            {isArabic ? 'إدارة المحافظات وربطها بالدول والمدن في النظام' : 'Manage governorates linked to countries and cities'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {/* Country Filter */}
                        <select
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                            className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E91E63] bg-white"
                        >
                            <option value="">{isArabic ? 'جميع الدول' : 'All Countries'}</option>
                            {countries.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {nameOf(c)}
                                </option>
                            ))}
                        </select>

                        {/* Search Input */}
                        <div className="relative flex-1 md:w-64">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={isArabic ? 'ابحث باسم المحافظة...' : 'Search governorate name...'}
                                className="w-full pr-8 pl-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E91E63]"
                            />
                            <svg className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                        </div>

                        {/* Add Button */}
                        {hasPermission('location.edit') && (
                            <button
                                type="button"
                                onClick={() => setModal({ open: true, governorate: null })}
                                className="px-4 py-2 bg-[#E91E63] text-white text-xs font-bold rounded-xl hover:bg-[#d81b58] transition shadow-sm flex items-center gap-1.5"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                {isArabic ? 'إضافة محافظة' : 'Add Governorate'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-50 text-[11px] font-bold text-gray-500 uppercase">
                                <th className="py-3.5 px-6">ID</th>
                                <th className="py-3.5 px-6">{isArabic ? 'اسم المحافظة' : 'Governorate Name'}</th>
                                <th className="py-3.5 px-6">{isArabic ? 'الدولة' : 'Country'}</th>
                                <th className="py-3.5 px-6">{isArabic ? 'الحالة' : 'Status'}</th>
                                <th className="py-3.5 px-6 text-center">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center text-xs text-gray-400">
                                        {isArabic ? 'جاري التحميل...' : 'Loading...'}
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center text-xs text-gray-400">
                                        {isArabic ? 'لا توجد محافظات مضافة.' : 'No governorates found.'}
                                    </td>
                                </tr>
                            ) : (
                                items.map((gov) => (
                                    <tr key={gov.id} className="hover:bg-gray-50/50 transition">
                                        <td className="py-4 px-6 text-xs text-gray-400 font-mono">#{gov.id}</td>
                                        <td className="py-4 px-6">
                                            <p className="text-xs font-bold text-gray-800">{nameOf(gov)}</p>
                                            <p className="text-[10px] text-gray-400">{gov.name_en}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-xs font-semibold text-gray-700">
                                                🌍 {nameOf(gov.country)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${gov.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${gov.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                {gov.status === 'active' ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center justify-center">
                                                <RowActionsMenu
                                                    items={[
                                                        {
                                                            key: 'edit',
                                                            label: t('common.edit') || (isArabic ? 'تعديل' : 'Edit'),
                                                            icon: <EditIcon />,
                                                            onClick: () => setModal({ open: true, governorate: gov }),
                                                        },
                                                        {
                                                            key: 'toggle',
                                                            label: gov.status === 'active' ? (isArabic ? 'تعطيل' : 'Deactivate') : (isArabic ? 'تفعيل' : 'Activate'),
                                                            icon: <ToggleIcon active={gov.status === 'active'} />,
                                                            onClick: () => toggle.mutate(gov.id),
                                                        },
                                                        {
                                                            key: 'delete',
                                                            label: t('common.delete') || (isArabic ? 'حذف' : 'Delete'),
                                                            icon: <TrashIcon />,
                                                            danger: true,
                                                            onClick: () => {
                                                                if (window.confirm(isArabic ? 'هل أنت تأكد من حذف هذه المحافظة؟' : 'Are you sure you want to delete this governorate?')) {
                                                                    deleteMutation.mutate(gov.id);
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
                {meta.last_page > 1 && (
                    <div className="p-4 border-t border-gray-50">
                        <Pagination currentPage={meta.current_page} totalPages={meta.last_page} onPageChange={setPage} />
                    </div>
                )}
            </div>

            {/* Action Modal */}
            {modal.open && (
                <GovernorateActionModal
                    governorateToEdit={modal.governorate}
                    onClose={() => setModal({ open: false, governorate: null })}
                />
            )}
        </div>
    );
}
