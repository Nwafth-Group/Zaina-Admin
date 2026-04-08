import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';
import ResetPasswordModal from './ResetPasswordModal.jsx';
import UserActionModal from './UserActionModal.jsx';

// لاحقاً سنستدعي المكونات هنا
// import UserActionModal from './components/UserActionModal';
// import ResetPasswordModal from './components/ResetPasswordModal';

export default function Users() {
    const { t } = useTranslation('users');
    const queryClient = useQueryClient();
    
    const [currentPage, setCurrentPage] = useState(1);
    
    // حالات للتحكم في النوافذ المنبثقة (Modals)
    const [selectedUserId, setSelectedUserId] = useState(null); // للعرض والتعديل
    const [resetPasswordUserId, setResetPasswordUserId] = useState(null); // لتغيير الباسوورد

    // 1. جلب بيانات الجدول
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['users', currentPage],
        queryFn: async () => {
            const response = await axiosInstance.get(`/admin/users?page=${currentPage}`);
            return response.data.data;
        },
        keepPreviousData: true,
    });

    // 2. إعداد عملية تغيير الحالة (Toggle Status)
    const toggleStatusMutation = useMutation({
        mutationFn: (userId) => {
            return axiosInstance.patch(`/admin/users/${userId}/toggle-status`);
        },
        onSuccess: () => {
            // تحديث الجدول فوراً بعد نجاح العملية
            queryClient.invalidateQueries({ queryKey: ['users', currentPage]});
        },
        onError: (error) => {
            console.error("Error toggling status:", error);
            alert("حدث خطأ أثناء تغيير الحالة.");
        }
    });

    const users = data?.items || [];
    const meta = data?.meta;

    if (isError) {
        return <div className="p-8 text-red-500 font-bold"> error happend {error.message}</div>;
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
            
            <div className="p-6 border-b border-gray-50">
                <h2 className="text-2xl font-bold text-gray-800">{t('title')}</h2>
               
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">{t('table.name')}</th>
                            <th className="px-6 py-4">{t('table.email')}</th>
                            <th className="px-6 py-4">{t('table.phone')}</th>
                            <th className="px-6 py-4">{t('table.role')}</th>
                            <th className="px-6 py-4 text-center">{t('table.status')}</th>
                            <th className="px-6 py-4 text-center">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-3">
                                        <svg className="animate-spin h-5 w-5 text-[#E91E63]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {t('loading')}
                                    </div>
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">{t('no_data')}</td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {user.full_name || '-'}
                                    </td>
                                    <td className="px-6 py-4">{user.email || '-'}</td>
                                    <td className="px-6 py-4" dir="ltr">{user.mobile_number || '-'}</td>
                                    <td className="px-6 py-4">
                                        {user.primary_role || '-'}
                                        {user.additional_roles_count > 0 && (
                                            <span className="text-xs text-gray-400 ms-1">(+{user.additional_roles_count})</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            user.status === 'active' 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {user.status === 'active' ? t('status.active') : t('status.inactive')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center items-center gap-3">
                                            
                                            {/* 1. زر عرض وتعديل (يفتح الـ Modal) */}
                                            <button 
                                                onClick={() => setSelectedUserId(user.id)}
                                                className="text-blue-500 hover:text-blue-700 transition-colors" 
                                                title={t('actions.edit_view')}
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>

                                            {/* 2. زر تغيير كلمة المرور (يفتح Modal الباسوورد) */}
                                            <button 
                                                onClick={() => setResetPasswordUserId(user.id)}
                                                className="text-purple-500 hover:text-purple-700 transition-colors" 
                                                title={t('actions.reset_password')}
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                </svg>
                                            </button>

                                            {/* 3. زر تغيير الحالة (يضرب على الـ API مباشرة) */}
                                            <button 
                                                onClick={() => toggleStatusMutation.mutate(user.id)}
                                                disabled={toggleStatusMutation.isPending}
                                                className={`${user.status === 'active' ? 'text-orange-500 hover:text-orange-700' : 'text-green-500 hover:text-green-700'} transition-colors disabled:opacity-50`} 
                                                title={t('actions.toggle_status')}
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                </svg>
                                            </button>
                                            
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination ... (نفس الكود السابق للترقيم) */}
            {meta && meta.last_page > 1 && (
                <div className="p-4 border-t border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <span className="text-sm text-gray-600">
                        {t('pagination.page')} {meta.current_page} / {meta.last_page}
                    </span>
                    <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(old => Math.max(old - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors">
                            {t('pagination.previous')}
                        </button>
                        <button onClick={() => setCurrentPage(old => (meta.current_page < meta.last_page ? old + 1 : old))} disabled={currentPage === meta.last_page} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors">
                            {t('pagination.next')}
                        </button>
                    </div>
                </div>
            )}

            {/* سيتم إضافة الـ Modals هنا لاحقاً بحيث تفتح بناءً على الـ State */}
            {selectedUserId && <UserActionModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />}
            {resetPasswordUserId && <ResetPasswordModal userId={resetPasswordUserId} onClose={() => setResetPasswordUserId(null)} />}

        </div>
    );
}