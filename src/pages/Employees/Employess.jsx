import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import EmployeeActionModal from './EmployeeActionModal';

export default function Employees() {
    const { t } = useTranslation('employees');
    const queryClient = useQueryClient();
    
    const [page, setPage] = useState(1);
    const [actionModal, setActionModal] = useState({ isOpen: false, employeeToEdit: null });

    // 1. جلب الموظفين مع دعم ترقيم الصفحات
    const { data: paginatedData, isLoading, isError, error } = useQuery({
        queryKey: ['employees', page],
        queryFn: async () => {
            const response = await axiosInstance.get(`/admin/employees?page=${page}`);
            return response.data.data;
        },
        keepPreviousData: true, 
    });

    // 2. تغيير حالة الموظف باستخدام PATCH
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

    const employees = paginatedData?.items || [];
    const meta = paginatedData?.meta;

    if (isError) return <div className="p-8 text-red-500 font-bold">حدث خطأ: {error.message}</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col min-h-[70vh]">
            
            <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('title')}</h2>
                <button 
                    onClick={() => setActionModal({ isOpen: true, employeeToEdit: null })}
                    className="w-full sm:w-auto bg-[#E91E63] text-white px-6 py-2.5 rounded-full font-medium hover:bg-[#D81B60] transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {t('add_new')}
                </button>
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
                                        <span className="bg-purple-50 text-purple-600 border border-purple-100 px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap">
                                            {employee.primary_role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-600 capitalize">
                                        {employee.type}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                            employee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {employee.status === 'active' ? t('status.active') : t('status.inactive')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-center items-center gap-2">
                                            <button 
                                                onClick={() => setActionModal({ isOpen: true, employeeToEdit: employee })}
                                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title={t('actions.edit')}
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button 
                                                onClick={() => toggleStatusMutation.mutate(employee.id)}
                                                disabled={toggleStatusMutation.isPending}
                                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${employee.status === 'active' ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`} 
                                                title={t('actions.toggle_status')}
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {meta && meta.last_page > 1 && (
                <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 mt-auto">
                    <span className="text-sm text-gray-500">
                        {t('pagination_showing', { from: meta.from, to: meta.to, total: meta.total, defaultValue: `Showing ${meta.from} to ${meta.to} of ${meta.total}` })}
                    </span>
                    <div className="flex gap-2">
                        <button 
                            disabled={page === 1} 
                            onClick={() => setPage(p => p - 1)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-100 transition-colors"
                        >
                            &laquo;
                        </button>
                        <span className="px-4 py-1.5 bg-[#E91E63] text-white rounded-lg font-bold">
                            {page}
                        </span>
                        <button 
                            disabled={page === meta.last_page} 
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-100 transition-colors"
                        >
                            &raquo;
                        </button>
                    </div>
                </div>
            )}

            {actionModal.isOpen && (
                <EmployeeActionModal 
                    employeeToEdit={actionModal.employeeToEdit} 
                    onClose={() => setActionModal({ isOpen: false, employeeToEdit: null })} 
                />
            )}

        </div>
    );
}