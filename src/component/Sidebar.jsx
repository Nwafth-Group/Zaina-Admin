import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axios';

const Sidebar = () => {
    const { t } = useTranslation('common');
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // إعداد الـ Mutation الخاص بتسجيل الخروج
    const logoutMutation = useMutation({
        mutationFn: () => {
            return axiosInstance.post('/admin/auth/logout');
        },
        onSuccess: () => {
            // 1. مسح البيانات من المتصفح
            localStorage.removeItem('zaina_admin_token');
            localStorage.removeItem('zaina_admin_user');
            
            // 2. مسح الكاش تبع React Query
            queryClient.clear();
            
            // 3. التوجيه لصفحة الدخول
            navigate('/auth/login', { replace: true });
        },
        onError: (error) => {
            console.error('Logout failed:', error);
            // كإجراء احترازي: حتى لو فشل الاتصال بالسيرفر، نمسح التوكن ونطرده
            localStorage.removeItem('zaina_admin_token');
            localStorage.removeItem('zaina_admin_user');
            navigate('/auth/login', { replace: true });
        }
    });

    const handleLogout = () => {
        logoutMutation.mutate();
    };

    // دالة مساعدة لتحديد إذا كان الرابط نشط (Active) لتمييزه بلون مختلف
    const isActive = (path) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <aside className="w-64 bg-white shadow-lg flex flex-col h-full border-r rtl:border-l rtl:border-r-0 border-gray-100 transition-all duration-300">
            {/* اللوجو والعنوان */}
            <div className="p-6 border-b border-gray-50 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-[#FDF0F3] text-[#E91E63] rounded-full flex items-center justify-center text-2xl font-bold mb-3 shadow-sm">
                    Z
                </div>
                <h2 className="text-xl font-bold text-gray-800">{t('sidebar.title')}</h2>
                <p className="text-xs text-gray-500 mt-1">{t('sidebar.subtitle')}</p>
            </div>

            {/* الروابط (Navigation) */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <Link
                    to="/"
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                        isActive('/') 
                        ? 'bg-[#E91E63] text-white shadow-md' 
                        : 'text-gray-600 hover:bg-[#FDF0F3] hover:text-[#E91E63]'
                    }`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {t('sidebar.dashboard')}
                </Link>

                <Link
                    to="/users"
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                        isActive('/users') 
                        ? 'bg-[#E91E63] text-white shadow-md' 
                        : 'text-gray-600 hover:bg-[#FDF0F3] hover:text-[#E91E63]'
                    }`}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {t('sidebar.user_management')}
                </Link>
            </nav>

            {/* زر تسجيل الخروج في الأسفل */}
            <div className="p-4 border-t border-gray-50">
                <button
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200 font-medium disabled:opacity-50"
                >
                    {logoutMutation.isPending ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    )}
                    {logoutMutation.isPending ? t('sidebar.logout_loading') : t('sidebar.logout')}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;