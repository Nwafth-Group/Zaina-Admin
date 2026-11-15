import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import RoleActionModal from './RoleActionModal';
import RowActionsMenu, { EditIcon, ToggleIcon } from '../../component/RowActionsMenu.jsx';
import { hasPermission, isSuperAdmin } from '../../utils/permissions.js';

export default function Roles() {
    const { t, i18n } = useTranslation('common');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [actionModal, setActionModal] = useState({ isOpen: false, roleToEdit: null });

    const lastCountsRef = useRef({ all: 0, active: 0, inactive: 0 });

    const canView = hasPermission('roles.view');
    const canCreate = hasPermission('roles.create');
    const canManage = isSuperAdmin();

    // Debounce the search input
    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput);
        }, 400);
        return () => clearTimeout(id);
    }, [searchInput]);

    // 1. Get Roles
    const { data: responseData, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['roles-list'],
        queryFn: async () => {
            const res = await axiosInstance.get('/admin/roles');
            return res.data?.data;
        },
        enabled: canView,
    });

    const roles = Array.isArray(responseData) ? responseData : responseData?.items || [];
    
    if (responseData?.counts) {
        lastCountsRef.current = responseData.counts;
    } else if (roles.length > 0) {
        lastCountsRef.current = {
            all: roles.length,
            active: roles.filter(r => r.status === 'active').length,
            inactive: roles.filter(r => r.status === 'inactive').length,
        };
    }
    const counts = lastCountsRef.current;

    // Filter roles based on search and status
    const filteredRoles = useMemo(() => {
        return roles.filter(role => {
            const matchesSearch = !search || 
                role.name?.toLowerCase().includes(search.toLowerCase()) || 
                role.code?.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = !statusFilter || role.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [roles, search, statusFilter]);

    // 2. Delete Role
    const deleteMutation = useMutation({
        mutationFn: (roleId) => axiosInstance.delete(`/admin/roles/${roleId}`),
        onSuccess: (response) => {
            toast.success(response.data?.message || t('role_management.delete_success'));
            queryClient.invalidateQueries({ queryKey: ['roles-list'] });
            refetch();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || t('role_management.delete_error'));
        }
    });

    // 3. Duplicate Role
    const duplicateMutation = useMutation({
        mutationFn: (roleId) => axiosInstance.post(`/admin/roles/${roleId}/duplicate`),
        onSuccess: (response) => {
            toast.success(response.data?.message || t('role_management.duplicate_success'));
            queryClient.invalidateQueries({ queryKey: ['roles-list'] });
            refetch();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || t('role_management.duplicate_error'));
        }
    });

    // 4. Toggle Status
    const toggleStatusMutation = useMutation({
        mutationFn: ({ id, currentStatus, roleData }) => {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            return axiosInstance.put(`/admin/roles/${id}`, {
                name: roleData.name,
                code: roleData.code,
                description: roleData.description,
                status: newStatus,
                permissions: roleData.permissions || [],
            });
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || t('role_management.status_success'));
            queryClient.invalidateQueries({ queryKey: ['roles-list'] });
            refetch();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || t('role_management.status_error'));
        }
    });

    const handleDelete = (role) => {
        if (window.confirm(t('role_management.confirm_delete', { name: role.name }))) {
            deleteMutation.mutate(role.id);
        }
    };

    if (!canView) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 ">
                <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">{t('role_management.unauthorized_title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('role_management.unauthorized_desc')}</p>
            </div>
        );
    }

    if (isError) return <div className="p-8 text-red-500 font-bold">{t('role_management.status_error')} ({error.message})</div>;

    const cardTabs = [
        { key: '', label: isArabic ? 'جميع الأدوار' : 'All Roles', count: counts.all, icon: '🔑', color: 'bg-[#FDF0F3] border-[#fbdbe3]' },
        { key: 'active', label: isArabic ? 'الأدوار النشطة' : 'Active Roles', count: counts.active, icon: '✅', color: 'bg-emerald-50 border-emerald-200' },
        { key: 'inactive', label: isArabic ? 'الأدوار المعطلة' : 'Inactive Roles', count: counts.inactive, icon: '⏸️', color: 'bg-gray-50 border-gray-200' },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'إدارة الأدوار وصلاحيات النظام' : 'Roles & Permissions Management'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'إدارة أدوار المستخدمين وصلاحيات الوصول للنظام.' : 'Manage user access levels, system roles, and authorization policies.'}
                    </p>
                </div>

                {canCreate && (
                    <button
                        onClick={() => setActionModal({ isOpen: true, roleToEdit: null })}
                        className="bg-[#E91E63] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#D81B60] transition shadow-sm flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>{t('role_management.add_role')}</span>
                    </button>
                )}
            </div>

            {/* Metric Tabs Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {cardTabs.map((card) => {
                    const isActive = statusFilter === card.key;
                    return (
                        <button
                            key={card.key}
                            onClick={() => setStatusFilter(card.key)}
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

            {/* Search Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
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
                        placeholder={t('role_management.search_placeholder')}
                        className="w-full border border-gray-200 rounded-lg ps-9 pe-3 py-2 text-xs focus:ring-1 focus:ring-[#E91E63] outline-none"
                    />
                </div>
            </div>

            {/* Roles Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full  border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider ">
                                <th className="py-3.5 px-4 ">{t('role_management.role_name')}</th>
                                <th className="py-3.5 px-4 ">{t('role_management.identifier')}</th>
                                <th className="py-3.5 px-4 ">{t('role_management.description')}</th>
                                <th className="py-3.5 px-4 ">{t('role_management.assigned_users')}</th>
                                <th className="py-3.5 px-4 ">{t('role_management.status')}</th>
                                {canManage && <th className="py-3.5 px-4  w-28">{t('role_management.actions')}</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="py-12  text-xs text-gray-400 font-bold">
                                        <div className="flex justify-center items-center gap-2">
                                            <svg className="animate-spin h-4 w-4 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                            <span>{t('role_management.loading')}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRoles.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-12  text-xs text-gray-400 font-bold">
                                        {t('role_management.no_roles')}
                                    </td>
                                </tr>
                            ) : (
                                filteredRoles.map((role) => {
                                    const isProtected = role.name === 'Super Admin' || 
                                        role.code?.toLowerCase() === 'customer' || 
                                        role.code?.toLowerCase() === 'driver' || 
                                        role.name?.toLowerCase() === 'customer' || 
                                        role.name?.toLowerCase() === 'driver';
                                    const uCount = role.users_count ?? role.number_of_assigned_users ?? 0;
                                    const countLabel = uCount === 0 ? t('role_management.users_count_zero') : (uCount === 1 ? t('role_management.users_count_one') : t('role_management.users_count_other', { count: uCount }));
                                    
                                    return (
                                        <tr key={role.id} className="hover:bg-gray-50/80 transition-colors ">
                                            <td className="py-3 px-4  font-bold text-gray-900">
                                                {t(`roles.${role.name}`, { defaultValue: role.name })}
                                            </td>
                                            <td className="py-3 px-4 ">
                                                <span className="bg-gray-100 text-gray-700 text-[11px] px-2.5 py-1 rounded font-mono font-bold">{role.code}</span>
                                            </td>
                                            <td className="py-3 px-4  text-gray-500 max-w-[250px] truncate" title={role.description}>
                                                {role.description || '-'}
                                            </td>
                                            <td className="py-3 px-4 ">
                                                <span className="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-3 py-1 rounded-full text-[11px]">
                                                    {countLabel}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 ">
                                                {canManage ? (
                                                    <button
                                                        onClick={() => toggleStatusMutation.mutate({ id: role.id, currentStatus: role.status, roleData: role })}
                                                        disabled={isProtected}
                                                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${role.status === 'active' ? 'bg-[#E91E63]' : 'bg-gray-200'} ${isProtected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${role.status === 'active' ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                                                    </button>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${role.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${role.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                        {role.status === 'active' ? t('role_management.active') : t('role_management.inactive')}
                                                    </span>
                                                )}
                                            </td>
                                            {canManage && (
                                                <td className="py-3 px-4 ">
                                                    <div className="flex justify-center items-center gap-1.5">
                                                        <button
                                                            onClick={() => setActionModal({ isOpen: true, roleToEdit: role })}
                                                            disabled={isProtected}
                                                            className={`p-1.5 rounded-lg text-blue-600 transition-colors ${isProtected ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                                                            title={t('role_management.edit_role')}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        {!isProtected && (
                                                            <>
                                                                <button
                                                                    onClick={() => duplicateMutation.mutate(role.id)}
                                                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-emerald-600 transition-colors"
                                                                    title={t('role_management.duplicate_role')}
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(role)}
                                                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-rose-600 transition-colors"
                                                                    title={t('role_management.delete_role')}
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Modal */}
            {actionModal.isOpen && (
                <RoleActionModal
                    roleToEdit={actionModal.roleToEdit}
                    onClose={() => setActionModal({ isOpen: false, roleToEdit: null })}
                    onSuccess={() => refetch()}
                />
            )}
        </div>
    );
}
