import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import RoleActionModal from './RoleActionModal';
import RowActionsMenu, { EditIcon, ToggleIcon } from '../../component/RowActionsMenu.jsx';
import { hasPermission, isSuperAdmin } from '../../utils/permissions.js';

export default function Roles() {
    const { t } = useTranslation('common');
    const queryClient = useQueryClient();

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [actionModal, setActionModal] = useState({ isOpen: false, roleToEdit: null });

    const canView = hasPermission('roles.view');
    const canCreate = hasPermission('roles.create');
    const canManage = isSuperAdmin(); // edit, delete, status toggle, duplicate

    // Debounce the search input
    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput);
        }, 400);
        return () => clearTimeout(id);
    }, [searchInput]);

    // 1. Get Roles
    const { data: roles = [], isLoading, isError, error } = useQuery({
        queryKey: ['roles-list'],
        queryFn: async () => {
            const res = await axiosInstance.get('/admin/roles');
            return res.data?.data?.items || res.data?.data || [];
        },
        enabled: canView,
    });

    // Filter roles based on search
    const filteredRoles = useMemo(() => {
        if (!search) return roles;
        return roles.filter(role => 
            role.name?.toLowerCase().includes(search.toLowerCase()) || 
            role.code?.toLowerCase().includes(search.toLowerCase())
        );
    }, [roles, search]);

    // 2. Delete Role
    const deleteMutation = useMutation({
        mutationFn: (roleId) => axiosInstance.delete(`/admin/roles/${roleId}`),
        onSuccess: (response) => {
            toast.success(response.data?.message || 'تم حذف الدور بنجاح');
            queryClient.invalidateQueries({ queryKey: ['roles-list'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء حذف الدور.');
        }
    });

    // 3. Duplicate Role
    const duplicateMutation = useMutation({
        mutationFn: (roleId) => axiosInstance.post(`/admin/roles/${roleId}/duplicate`),
        onSuccess: (response) => {
            toast.success(response.data?.message || 'تم تكرار الدور بنجاح');
            queryClient.invalidateQueries({ queryKey: ['roles-list'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء تكرار الدور.');
        }
    });

    // 4. Toggle Status (PUT update)
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
            toast.success(response.data?.message || 'تم تحديث حالة الدور بنجاح');
            queryClient.invalidateQueries({ queryKey: ['roles-list'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء تعديل الحالة.');
        }
    });

    const handleDelete = (role) => {
        if (window.confirm(`هل أنت متأكد من حذف الدور: ${role.name}؟`)) {
            deleteMutation.mutate(role.id);
        }
    };

    if (!canView) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-800">غير مصرح بالدخول</h2>
                <p className="text-sm text-gray-500 mt-1">ليس لديك صلاحية لعرض الأدوار والصلاحيات.</p>
            </div>
        );
    }

    if (isError) return <div className="p-8 text-red-500 font-bold">حدث خطأ: {error.message}</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col min-h-[70vh] font-main">
            
            <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">إدارة الأدوار والصلاحيات (RBAC)</h2>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400 pointer-events-none">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="بحث باسم الدور..."
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none w-full ps-9"
                        />
                    </div>

                    {/* Add new */}
                    {canCreate && (
                        <button
                            onClick={() => setActionModal({ isOpen: true, roleToEdit: null })}
                            className="bg-[#E91E63] text-white px-5 py-2 rounded-full font-medium hover:bg-[#D81B60] transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            إضافة دور جديد
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto w-full flex-1">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500 min-w-[800px]">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">اسم الدور</th>
                            <th className="px-6 py-4">رمز التعريفي</th>
                            <th className="px-6 py-4">الوصف</th>
                            <th className="px-6 py-4 text-center">المستخدمين المرتبطين</th>
                            <th className="px-6 py-4 text-center">الحالة</th>
                            {canManage && <th className="px-6 py-4 text-center">العمليات</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-3">
                                        <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                                        <span className="text-lg font-medium">جاري تحميل البيانات...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredRoles.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-400">لا توجد أدوار مسجلة حالياً.</td>
                            </tr>
                        ) : (
                            filteredRoles.map((role) => (
                                <tr key={role.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-gray-800">{role.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded font-mono">{role.code}</span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 max-w-[250px] truncate" title={role.description}>{role.description || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full text-xs">
                                            {role.users_count ?? role.number_of_assigned_users ?? 0} مستخدم
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {canManage ? (
                                            <button
                                                onClick={() => toggleStatusMutation.mutate({ id: role.id, currentStatus: role.status, roleData: role })}
                                                disabled={role.name === 'Super Admin'}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${role.status === 'active' ? 'bg-[#E91E63]' : 'bg-gray-200'} ${role.name === 'Super Admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${role.status === 'active' ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        ) : (
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${role.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                {role.status === 'active' ? 'نشط' : 'غير نشط'}
                                            </span>
                                        )}
                                    </td>
                                    {canManage && (
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <button
                                                    onClick={() => setActionModal({ isOpen: true, roleToEdit: role })}
                                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-blue-600 transition-colors"
                                                    title="تعديل الدور والصلاحيات"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => duplicateMutation.mutate(role.id)}
                                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-emerald-600 transition-colors"
                                                    title="تكرار الدور"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(role)}
                                                    disabled={role.name === 'Super Admin' || (role.users_count ?? 0) > 0}
                                                    className={`p-1.5 rounded-lg text-red-600 transition-colors ${role.name === 'Super Admin' || (role.users_count ?? 0) > 0 ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : 'hover:bg-red-50'}`}
                                                    title="حذف الدور"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {actionModal.isOpen && (
                <RoleActionModal
                    roleToEdit={actionModal.roleToEdit}
                    onClose={() => {
                        setActionModal({ isOpen: false, roleToEdit: null });
                    }}
                />
            )}
        </div>
    );
}
