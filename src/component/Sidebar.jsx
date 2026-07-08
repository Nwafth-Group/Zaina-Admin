import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { hasPermission, getRoles } from '../utils/permissions.js';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { t } = useTranslation('common');
    const location = useLocation();

    // Show the logged-in admin's (translated) role under the brand name.
    const role = getRoles()[0];
    const roleLabel = role ? t(`roles.${role}`, { defaultValue: role }) : '';

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
                    {roleLabel && <p className="text-xs text-gray-500 mt-1">{roleLabel}</p>}
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
                        to="/bookings"
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                            isActive('/bookings')
                            ? 'bg-[#E91E63] text-white shadow-md'
                            : 'text-gray-600 hover:bg-[#FDF0F3] hover:text-[#E91E63]'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                        </svg>
                        {t('sidebar.bookings')}
                    </Link>

                    <Link
                        to="/clients"
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                            isActive('/clients')
                            ? 'bg-[#E91E63] text-white shadow-md'
                            : 'text-gray-600 hover:bg-[#FDF0F3] hover:text-[#E91E63]'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        {t('sidebar.clients')}
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

                     <Link
                        to="/services"
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                            isActive('/services') 
                            ? 'bg-[#E91E63] text-white shadow-md' 
                            : 'text-gray-600 hover:bg-[#FDF0F3] hover:text-[#E91E63]'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                        </svg>
                        {t('sidebar.services')}
                    </Link>

                    <Link
                        to="/workers"
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                            isActive('/workers') 
                            ? 'bg-[#E91E63] text-white shadow-md' 
                            : 'text-gray-600 hover:bg-[#FDF0F3] hover:text-[#E91E63]'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                        </svg>
                        {t('sidebar.workers')}
                    </Link>

                    <Link
                        to="/banners"
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                            isActive('/banners')
                            ? 'bg-[#E91E63] text-white shadow-md'
                            : 'text-gray-600 hover:bg-[#FDF0F3] hover:text-[#E91E63]'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        {t('sidebar.banners')}
                    </Link>

                    <Link
                        to="/announcements"
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                            isActive('/announcements')
                            ? 'bg-[#E91E63] text-white shadow-md'
                            : 'text-gray-600 hover:bg-[#FDF0F3] hover:text-[#E91E63]'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                        </svg>
                        {t('sidebar.announcements')}
                    </Link>

                    <Link
                        to="/coupons"
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                            isActive('/coupons')
                            ? 'bg-[#E91E63] text-white shadow-md'
                            : 'text-gray-600 hover:bg-[#FDF0F3] hover:text-[#E91E63]'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                        {t('sidebar.coupons', { defaultValue: 'Coupons' })}
                    </Link>

                    {hasPermission('employees.view') && (
                        <Link
                            to="/employees"
                            onClick={handleLinkClick}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                                isActive('/employees')
                                ? 'bg-[#E91E63] text-white shadow-md'
                                : 'text-gray-600 hover:bg-[#FDF0F3] hover:text-[#E91E63]'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.073c0 1.313-.953 2.439-2.253 2.632a48.81 48.81 0 01-11.994 0c-1.3-.193-2.253-1.319-2.253-2.632V14.15M8.25 6.75h7.5a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25V9a2.25 2.25 0 012.25-2.25zM9 6.75V5.25A2.25 2.25 0 0111.25 3h1.5A2.25 2.25 0 0115 5.25v1.5" />
                            </svg>
                            {t('sidebar.employees')}
                        </Link>
                    )}



                </nav>

                {hasPermission('location.edit') && (
                    <div className="p-4 border-t border-gray-50">
                        <Link
                            to="/settings"
                            onClick={handleLinkClick}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                                isActive('/settings')
                                ? 'bg-[#E91E63] text-white shadow-md'
                                : 'text-gray-600 hover:bg-[#FDF0F3] hover:text-[#E91E63]'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {t('sidebar.settings')}
                        </Link>
                    </div>
                )}
            </aside>
        </>
    );
};

export default Sidebar;