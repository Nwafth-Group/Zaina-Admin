import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import EmployeeActionModal from './EmployeeActionModal';
import RowActionsMenu, { EditIcon, ToggleIcon, TrashIcon } from '../../component/RowActionsMenu.jsx';
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
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [actionModal, setActionModal] = useState({ isOpen: false, employeeToEdit: null });

    const lastCountsRef = useRef({ all: 0, active: 0, inactive: 0, operation: 0, driver: 0 });

    const canView = hasPermission('employees.view');
    const canCreate = hasPermission('employees.create');

    // Debounce search input
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

    const activeFilterCount =
        (filters.status ? 1 : 0) +
        (filters.type ? 1 : 0) +
        (filters.created_from ? 1 : 0) +
        (filters.created_to ? 1 : 0) +
        (filters.sort_by !== DEFAULT_FILTERS.sort_by || filters.sort_dir !== DEFAULT_FILTERS.sort_dir ? 1 : 0);

    const { data: paginatedData, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['employees', queryString],
        queryFn: async () => (await axiosInstance.get(`/admin/employees?${queryString}`)).data.data,
        keepPreviousData: true,
        enabled: canView,
    });

    const { data: roles = [] } = useQuery({
        queryKey: ['roles-for-filter'],
        queryFn: async () => (await axiosInstance.get('/admin/roles')).data.data.items || [],
        enabled: canView,
    });

    const toggleStatusMutation = useMutation({
        mutationFn: (employeeId) => axiosInstance.patch(`/admin/employees/${employeeId}/toggle-status`),
        onSuccess: (response) => {
            toast.success(response.data?.message || "تم تغيير الحالة بنجاح");
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            refetch();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "حدث خطأ أثناء العملية.");
        }
    });

    const deleteEmployeeMutation = useMutation({
        mutationFn: (employeeId) => axiosInstance.delete(`/admin/employees/${employeeId}`),
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? "تم حذف الموظف بنجاح" : "Employee deleted successfully"));
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            refetch();
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

    if (paginatedData?.counts) {
        lastCountsRef.current = paginatedData.counts;
    }
    const counts = lastCountsRef.current;

    const selectClass =
        'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none';

    if (!canView) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 ">
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

    const cardTabs = [
        { key: '', label: isArabic ? 'جميع الموظفين' : 'All Staff', count: counts.all, icon: '👨‍💼', color: 'bg-[#FDF0F3] border-[#fbdbe3]' },
        { key: 'active', label: isArabic ? 'الموظفين النشطين' : 'Active Staff', count: counts.active, icon: '✅', color: 'bg-emerald-50 border-emerald-200' },
        { key: 'inactive', label: isArabic ? 'الموظفين غير النشطين' : 'Inactive Staff', count: counts.inactive, icon: '⏸️', color: 'bg-gray-50 border-gray-200' },
        { key: 'operation', label: isArabic ? 'فريق العمليات' : 'Operation Team', count: counts.operation, icon: '⚙️', color: 'bg-purple-50 border-purple-200' },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'إدارة الموظفين والصلاحيات' : 'Employees & Staff Management'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'إدارة حسابات الموظفين، الأدوار، وحدود النقاط.' : 'Manage staff accounts, administrative roles, and monthly points limits.'}
                    </p>
                </div>

                {canCreate && (
                    <button
                        onClick={() => setActionModal({ isOpen: true, employeeToEdit: null })}
                        className="bg-[#E91E63] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#D81B60] transition shadow-sm flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>{t('add_new')}</span>
                    </button>
                )}
            </div>

            {/* Metric Tabs Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {cardTabs.map((card) => {
                    const isActive = card.key === '' ? filters.status === '' && filters.type === '' : filters.status === card.key || filters.type === card.key;
                    return (
                        <button
                            key={card.key}
                            onClick={() => {
                                if (card.key === 'operation') {
                                    setFilters((f) => ({ ...f, type: 'operation', status: '' }));
                                } else {
                                    setFilters((f) => ({ ...f, status: card.key, type: '' }));
                                }
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

            {/* Role Tab Bar */}
            <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-1 overflow-x-auto">
                <button
                    onClick={() => selectRole('')}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition ${filters.role === '' ? 'bg-[#E91E63] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    {t('tabs.all')}
                </button>
                {roles.filter((role) => !['Driver', 'Customer'].includes(role.name)).map((role) => {
                    const active = filters.role === role.name;
                    return (
                        <button
                            key={role.id}
                            onClick={() => selectRole(role.name)}
                            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition ${active ? 'bg-[#E91E63] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            {t(`roles_map.${role.name}`, { defaultValue: role.name })}
                        </button>
                    );
                })}
            </div>

            {/* Filter & Search Toolbar */}
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
                        placeholder={t('filters.search_placeholder')}
                        className="w-full border border-gray-200 rounded-lg ps-9 pe-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] outline-none"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button
                        onClick={openFilters}
                        className="relative inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-3.5 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
                    >
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 018 17v-3.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        <span>{t('filters.button')}</span>
                        {activeFilterCount > 0 && (
                            <span className="bg-[#E91E63] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={exportToCSV}
                        className="inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-3.5 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition"
                        title={t('export_csv', { defaultValue: 'Export to CSV' })}
                    >
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{t('export', { defaultValue: 'تصدير' })}</span>
                    </button>
                </div>
            </div>

            {/* Employees Data Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full  border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider ">
                                <th className="py-3.5 px-4  w-16">{t('table.image')}</th>
                                <th className="py-3.5 px-4 ">{t('table.name')}</th>
                                <th className="py-3.5 px-4 ">{t('table.contact')}</th>
                                <th className="py-3.5 px-4 ">{t('table.role')}</th>
                                <th className="py-3.5 px-4 ">{t('table.type')}</th>
                                <th className="py-3.5 px-4 ">{isArabic ? 'حد النقاط الشهري' : 'Monthly Limit'}</th>
                                <th className="py-3.5 px-4 ">{t('table.status')}</th>
                                <th className="py-3.5 px-4  w-28">{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="8" className="py-12  text-xs text-gray-400 font-bold">
                                        <div className="flex justify-center items-center gap-2">
                                            <svg className="animate-spin h-4 w-4 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                            <span>{t('loading')}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-12  text-xs text-gray-400 font-bold">
                                        {t('no_data')}
                                    </td>
                                </tr>
                            ) : (
                                employees.map((employee) => (
                                    <tr key={employee.id} className="hover:bg-gray-50/80 transition-colors ">
                                        <td className="py-3 px-4 ">
                                            <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-tr from-[#E91E63] to-[#F4A9BC] text-white flex items-center justify-center font-bold overflow-hidden shadow-sm">
                                                {employee.image ? (
                                                    <img src={employee.image} alt={employee.first_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span>{employee.first_name?.charAt(0) || 'E'}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4  font-bold text-gray-900">
                                            {employee.full_name}
                                        </td>
                                        <td className="py-3 px-4 ">
                                            <div className="font-medium text-gray-900">{employee.email}</div>
                                            <div className="text-[11px] text-gray-400 mt-0.5" dir="ltr">{employee.mobile_number}</div>
                                        </td>
                                        <td className="py-3 px-4 ">
                                            {employee.primary_role ? (
                                                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap inline-flex">
                                                    {t(`roles_map.${employee.primary_role}`, { defaultValue: employee.primary_role })}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="py-3 px-4  font-bold text-gray-600 capitalize">
                                            {t(`types.${employee.type}`, { defaultValue: employee.type })}
                                        </td>
                                        <td className="py-3 px-4 ">
                                            {employee.monthly_points_limit !== null && employee.monthly_points_limit > 0 ? (
                                                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap inline-flex">
                                                    {employee.monthly_points_limit.toLocaleString()} Pts
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">{isArabic ? 'غير محدود' : 'Unlimited'}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 ">
                                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${
                                                employee.status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${employee.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                                {employee.status === 'active' ? t('status.active') : t('status.inactive')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 ">
                                            <div className="flex justify-center">
                                                <RowActionsMenu
                                                    label={t('actions.edit')}
                                                    items={[
                                                        hasPermission('employees.edit') && {
                                                            key: 'edit',
                                                            label: t('actions.edit'),
                                                            icon: <EditIcon />,
                                                            onClick: () => setActionModal({ isOpen: true, employeeToEdit: employee }),
                                                        },
                                                        hasPermission('employees.edit') && {
                                                            key: 'toggle',
                                                            label: t('actions.toggle_status'),
                                                            icon: <ToggleIcon />,
                                                            onClick: () => toggleStatusMutation.mutate(employee.id),
                                                            disabled: toggleStatusMutation.isPending,
                                                        },
                                                        hasPermission('employees.delete') && {
                                                            key: 'delete',
                                                            label: isArabic ? 'حذف' : 'Delete',
                                                            icon: <TrashIcon />,
                                                            danger: true,
                                                            onClick: () => {
                                                                if (window.confirm(isArabic ? 'هل أنت متأكد من رغبتك في حذف هذا الموظف؟' : 'Are you sure you want to delete this employee?')) {
                                                                    deleteEmployeeMutation.mutate(employee.id);
                                                                }
                                                            },
                                                            disabled: deleteEmployeeMutation.isPending,
                                                        },
                                                    ].filter(Boolean)}
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
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{t('pagination.rows_per_page', { defaultValue: 'عدد الأسطر:' })}</span>
                        <select
                            value={filters.per_page}
                            onChange={(e) => {
                                setFilters(f => ({ ...f, per_page: Number(e.target.value) }));
                                setPage(1);
                            }}
                            className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 bg-white focus:ring-1 focus:ring-[#E91E63] outline-none"
                        >
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Filter Drawer */}
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

                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{t('filters.status')}</label>
                            <select
                                value={draftFilters.status}
                                onChange={(e) => updateDraft('status', e.target.value)}
                                className={`${selectClass} w-full`}
                            >
                                <option value="">{t('filters.all_statuses')}</option>
                                <option value="active">{t('status.active')}</option>
                                <option value="inactive">{t('status.inactive')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-100 flex gap-2">
                        <button onClick={resetFilters} className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                            {t('filters.reset')}
                        </button>
                        <button onClick={applyFilters} className="flex-1 py-2 text-xs font-bold text-white bg-[#E91E63] rounded-lg hover:bg-[#D81B60] transition">
                            {t('filters.apply')}
                        </button>
                    </div>
                </aside>
            </div>

            {/* Action Modal */}
            {actionModal.isOpen && (
                <EmployeeActionModal
                    employeeToEdit={actionModal.employeeToEdit}
                    onClose={() => setActionModal({ isOpen: false, employeeToEdit: null })}
                    onSuccess={() => refetch()}
                />
            )}
        </div>
    );
}