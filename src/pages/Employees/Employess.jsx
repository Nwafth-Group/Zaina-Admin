import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import EmployeeActionModal from './EmployeeActionModal';
import RowActionsMenu, { EditIcon, ToggleIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';
import { hasPermission } from '../../utils/permissions.js';

const DEFAULT_FILTERS = {
    status: '',
    type: '',
    role: '',
    sort_by: 'created_at',
    sort_dir: 'desc',
    created_from: '',
    created_to: '',
    per_page: 15,
};

export default function Employees() {
    const { t, i18n } = useTranslation('employees');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');              // committed search (applies live)
    const [filters, setFilters] = useState(DEFAULT_FILTERS); // committed drawer filters
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS); // staged until "Apply"
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [actionModal, setActionModal] = useState({ isOpen: false, employeeToEdit: null });

    // Employee management is Super-Admin only (enforced server-side too).
    const canView = hasPermission('employees.view');
    const canCreate = hasPermission('employees.create');

    // Debounce the free-text search before it hits the API.
    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(id);
    }, [searchInput]);

    const openFilters = () => {
        setDraftFilters(filters);
        setIsFilterOpen(true);
    };

    const updateDraft = (key, value) => setDraftFilters((d) => ({ ...d, [key]: value }));

    const handleSortChange = (value) => {
        const [sort_by, sort_dir] = value.split(':');
        setDraftFilters((d) => ({ ...d, sort_by, sort_dir }));
    };

    const applyFilters = () => {
        setFilters(draftFilters);
        setPage(1);
        setIsFilterOpen(false);
    };

    const resetFilters = () => {
        setSearchInput('');
        setSearch('');
        setFilters(DEFAULT_FILTERS);
        setDraftFilters(DEFAULT_FILTERS);
        setPage(1);
    };

    // Role tab bar commits to the live filters directly (like Bookings/Clients).
    const selectRole = (value) => {
        setFilters((f) => ({ ...f, role: value }));
        setPage(1);
    };

    const queryString = useMemo(() => {
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.append('search', search);
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== '' && value != null) params.append(key, value);
        });
        return params.toString();
    }, [page, search, filters]);

    // Drawer filters that are active. `role` is handled by the tab bar and
    // `search` lives in the header, so both are excluded from the drawer badge.
    const activeFilterCount =
        (filters.status ? 1 : 0) +
        (filters.type ? 1 : 0) +
        (filters.created_from ? 1 : 0) +
        (filters.created_to ? 1 : 0) +
        (filters.sort_by !== DEFAULT_FILTERS.sort_by || filters.sort_dir !== DEFAULT_FILTERS.sort_dir ? 1 : 0);

    // 1. جلب الموظفين مع الفلاتر والبحث وترقيم الصفحات
    const { data: paginatedData, isLoading, isError, error } = useQuery({
        queryKey: ['employees', queryString],
        queryFn: async () => (await axiosInstance.get(`/admin/employees?${queryString}`)).data.data,
        keepPreviousData: true,
        enabled: canView,
    });

    // 2. جلب الأدوار (Roles) لفلتر الدور
    const { data: roles = [] } = useQuery({
        queryKey: ['roles-for-filter'],
        queryFn: async () => (await axiosInstance.get('/admin/roles')).data.data.items || [],
        enabled: canView,
    });

    // 3. تغيير حالة الموظف باستخدام PATCH
    const toggleStatusMutation = useMutation({
        mutationFn: (employeeId) => {
            return axiosInstance.patch(`/admin/employees/${employeeId}/toggle-status`);
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || "تم تغيير الحالة بنجاح");
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "حدث خطأ أثناء العملية.");
        }
    });

    const exportToCSV = () => {
        if (!employees || employees.length === 0) {
            toast.error("لا توجد بيانات لتصديرها");
            return;
        }

        const headers = ["User ID", "Full Name", "Email", "Phone", "Status", "Role", "Registration Date"];
        const rows = employees.map(emp => [
            emp.id,
            emp.full_name,
            emp.email,
            emp.mobile_number || '',
            emp.status,
            emp.primary_role || emp.type,
            emp.created_at
        ]);

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
            + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `employees_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("تم تصدير الملف بنجاح!");
    };

    const employees = paginatedData?.items || [];
    const meta = paginatedData?.meta;

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';

    if (!canView) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">{t('access_denied.title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('access_denied.message')}</p>
            </div>
        );
    }

    if (isError) return <div className="p-8 text-red-500 font-bold">حدث خطأ: {error.message}</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col min-h-[70vh]">
            
            <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('title')}</h2>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[180px]">
                        <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400 pointer-events-none">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder={t('filters.search_placeholder')}
                            className={`${selectClass} w-full ps-9`}
                        />
                    </div>

                    {/* Filter button (opens the left drawer) */}
                    <button
                        onClick={openFilters}
                        className="relative inline-flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 018 17v-3.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        <span>{t('filters.button')}</span>
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-2 -end-2 bg-[#E91E63] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {/* Export */}
                    <button
                        onClick={exportToCSV}
                        className="inline-flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        title={t('export_csv', { defaultValue: 'Export to CSV' })}
                    >
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{t('export', { defaultValue: 'تصدير' })}</span>
                    </button>

                    {/* Add new */}
                    {canCreate && (
                        <button
                            onClick={() => setActionModal({ isOpen: true, employeeToEdit: null })}
                            className="bg-[#E91E63] text-white px-5 py-2 rounded-full font-medium hover:bg-[#D81B60] transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            {t('add_new')}
                        </button>
                    )}
                </div>
            </div>

            {/* Role quick-filter tab bar — selected tab highlighted, others plain */}
            <div className="px-4 md:px-6 py-2.5 border-b border-gray-50 flex items-center justify-center gap-1 overflow-x-auto">
                <button
                    onClick={() => selectRole('')}
                    className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filters.role === '' ? 'bg-[#E91E63] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    {t('tabs.all')}
                </button>
                {roles.filter((role) => !['Driver', 'Customer'].includes(role.name)).map((role) => {
                    const active = filters.role === role.name;
                    return (
                        <button
                            key={role.id}
                            onClick={() => selectRole(role.name)}
                            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-[#E91E63] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {t(`roles_map.${role.name}`, { defaultValue: role.name })}
                        </button>
                    );
                })}
            </div>

            <div className="overflow-x-auto w-full flex-1">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500 min-w-[800px]">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-4 w-16 text-center">{t('table.image')}</th>
                            <th className="px-4 py-4">{t('table.name')}</th>
                            <th className="px-4 py-4">{t('table.contact')}</th>
                            <th className="px-4 py-4">{t('table.role')}</th>
                            <th className="px-4 py-4 text-center">{t('table.type')}</th>
                            <th className="px-4 py-4 text-center">{t('table.status')}</th>
                            <th className="px-4 py-4 text-center">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-3">
                                        <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                        <span className="text-lg font-medium">{t('loading')}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : employees.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-10 text-center text-gray-500">{t('no_data')}</td>
                            </tr>
                        ) : (
                            employees.map((employee) => (
                                <tr key={employee.id} className="border-b transition-colors hover:bg-gray-50 bg-white">
                                    <td className="px-4 py-3 text-center">
                                        <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-tr from-[#E91E63] to-[#F4A9BC] text-white flex items-center justify-center font-bold overflow-hidden shadow-sm">
                                            {employee.image ? (
                                                <img src={employee.image} alt={employee.first_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{employee.first_name.charAt(0)}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-gray-800">{employee.full_name}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-xs text-gray-800">{employee.email}</p>
                                        <p className="text-xs text-gray-500 mt-0.5" dir="ltr">{employee.mobile_number}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        {employee.primary_role && (
                                            <span className="bg-purple-50 text-purple-600 border border-purple-100 px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap">
                                                {t(`roles_map.${employee.primary_role}`, { defaultValue: employee.primary_role })}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-600">
                                        {t(`types.${employee.type}`, { defaultValue: employee.type })}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                            employee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {employee.status === 'active' ? t('status.active') : t('status.inactive')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <RowActionsMenu
                                            label={t('actions.edit')}
                                            items={[
                                                {
                                                    key: 'edit',
                                                    label: t('actions.edit'),
                                                    icon: <EditIcon />,
                                                    onClick: () => setActionModal({ isOpen: true, employeeToEdit: employee }),
                                                },
                                                {
                                                    key: 'toggle',
                                                    label: t('actions.toggle_status'),
                                                    icon: <ToggleIcon />,
                                                    onClick: () => toggleStatusMutation.mutate(employee.id),
                                                    disabled: toggleStatusMutation.isPending,
                                                },
                                            ]}
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 md:p-6 border-t border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <Pagination meta={meta} onPageChange={setPage} />
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{t('pagination.rows_per_page', { defaultValue: 'عدد الأسطر:' })}</span>
                    <select
                        value={filters.per_page}
                        onChange={(e) => {
                            setFilters(f => ({ ...f, per_page: Number(e.target.value) }));
                            setPage(1);
                        }}
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                    >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            {/* Filter drawer (slides in from the right) */}
            <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${isFilterOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/40" onClick={() => setIsFilterOpen(false)} />
                <aside className={`absolute top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ${
                    isArabic
                        ? `left-0 ${isFilterOpen ? 'translate-x-0' : '-translate-x-full'}`
                        : `right-0 ${isFilterOpen ? 'translate-x-0' : 'translate-x-full'}`
                }`}>
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800">{t('filters.title')}</h3>
                        <button onClick={() => setIsFilterOpen(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" aria-label="close">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.status_label')}</label>
                            <select value={draftFilters.status} onChange={(e) => updateDraft('status', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.all_statuses')}</option>
                                <option value="active">{t('status.active')}</option>
                                <option value="inactive">{t('status.inactive')}</option>
                                <option value="suspended">{t('status.suspended')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.type_label')}</label>
                            <select value={draftFilters.type} onChange={(e) => updateDraft('type', e.target.value)} className={`${selectClass} w-full`}>
                                <option value="">{t('filters.all_types')}</option>
                                <option value="operation">{t('types.operation')}</option>
                                <option value="super_admin">{t('types.super_admin')}</option>
                            </select>
                        </div>


                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.sort_label')}</label>
                            <select value={`${draftFilters.sort_by}:${draftFilters.sort_dir}`} onChange={(e) => handleSortChange(e.target.value)} className={`${selectClass} w-full`}>
                                <option value="created_at:desc">{t('filters.sort_newest')}</option>
                                <option value="created_at:asc">{t('filters.sort_oldest')}</option>
                                <option value="first_name:asc">{t('filters.sort_name')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.date_from', { defaultValue: 'تاريخ التسجيل من' })}</label>
                            <input
                                type="date"
                                value={draftFilters.created_from}
                                onChange={(e) => updateDraft('created_from', e.target.value)}
                                className={`${selectClass} w-full`}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1.5">{t('filters.date_to', { defaultValue: 'تاريخ التسجيل إلى' })}</label>
                            <input
                                type="date"
                                value={draftFilters.created_to}
                                onChange={(e) => updateDraft('created_to', e.target.value)}
                                className={`${selectClass} w-full`}
                            />
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 flex items-center gap-3">
                        <button
                            onClick={resetFilters}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                        >
                            {t('filters.reset')}
                        </button>
                        <button
                            onClick={applyFilters}
                            className="flex-1 px-4 py-2 bg-[#E91E63] text-white rounded-lg hover:bg-[#D81B60] font-medium transition-colors"
                        >
                            {t('filters.done')}
                        </button>
                    </div>
                </aside>
            </div>

            {actionModal.isOpen && (
                <EmployeeActionModal
                    employeeToEdit={actionModal.employeeToEdit}
                    onClose={() => setActionModal({ isOpen: false, employeeToEdit: null })}
                />
            )}

        </div>
    );
}