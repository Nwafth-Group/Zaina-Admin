import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axios';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { t } = useTranslation('common');
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const logoutMutation = useMutation({
        mutationFn: () => {
            return axiosInstance.post('/admin/auth/logout');
        },
        onSuccess: () => {
            localStorage.removeItem('zaina_admin_token');
            localStorage.removeItem('zaina_admin_user');
            queryClient.clear();
            navigate('/auth/login', { replace: true });
        },
        onError: (error) => {
            console.error('Logout failed:', error);
            localStorage.removeItem('zaina_admin_token');
            localStorage.removeItem('zaina_admin_user');
            navigate('/auth/login', { replace: true });
        }
    });

    const handleLogout = () => {
        logoutMutation.mutate();
    };

    const isActive = (path) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const handleLinkClick = () => {
        if (window.innerWidth < 768) {
            setIsOpen(false);
        }
    };

    return (
        <>
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity"
                    onClick={() => setIsOpen(false)}
                ></div>
            )}

            <aside className={`
                fixed inset-y-0 ltr:left-0 rtl:right-0 z-50
                w-64 bg-white shadow-2xl md:shadow-lg flex flex-col h-full 
                border-r rtl:border-l rtl:border-r-0 border-gray-100 
                transition-transform duration-300 ease-in-out
                md:static md:!translate-x-0
                ${isOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'}
            `}>
                
                <button 
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 ltr:right-4 rtl:left-4 md:hidden p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-full"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="p-6 border-b border-gray-50 flex flex-col items-center justify-center mt-4 md:mt-0">
                    <div className="w-16 h-16 bg-[#FDF0F3] text-[#E91E63] rounded-full flex items-center justify-center text-2xl font-bold mb-3 shadow-sm">
                        Z
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">{t('sidebar.title')}</h2>
                    <p className="text-xs text-gray-500 mt-1">{t('sidebar.subtitle')}</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <Link
                        to="/"
                        onClick={handleLinkClick}
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
                        onClick={handleLinkClick}
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

                    <Link
                        to="/categories"
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                            isActive('/categories') 
                            ? 'bg-[#E91E63] text-white shadow-md' 
                            : 'text-gray-600 hover:bg-[#FDF0F3] hover:text-[#E91E63]'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        {t('sidebar.category_management')}
                    </Link>
                </nav>

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
        </>
    );
};

export default Sidebar;