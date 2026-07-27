import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { hasPermission, getRoles } from '../utils/permissions.js';

const Sidebar = ({ isOpen, setIsOpen, isCollapsed, setIsCollapsed, companyData }) => {
    const { t, i18n } = useTranslation('common');
    const isArabic = i18n.language?.startsWith('ar');
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

    // Navigation groups & items structure
    const groups = [
        {
            title: isArabic ? 'الرئيسية' : 'Overview',
            items: [
                {
                    to: '/',
                    label: t('sidebar.dashboard'),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    ),
                    permission: null
                },
                {
                    to: '/reports',
                    label: t('sidebar.reports', { defaultValue: 'Reports' }),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    ),
                    permission: 'reports.view'
                }
            ]
        },
        {
            title: isArabic ? 'العمليات' : 'Operations',
            items: [
                {
                    to: '/bookings',
                    label: t('sidebar.bookings'),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                        </svg>
                    ),
                    permission: 'bookings.view'
                },
                {
                    to: '/clients',
                    label: t('sidebar.clients'),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    ),
                    permission: 'users.view'
                },
                {
                    to: '/services',
                    label: t('sidebar.services'),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                        </svg>
                    ),
                    permission: 'services.view'
                },
                {
                    to: '/workers',
                    label: t('sidebar.workers'),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                        </svg>
                    ),
                    permission: 'workers.view'
                },
                {
                    to: '/reviews',
                    label: t('sidebar.reviews', { defaultValue: isArabic ? 'التقييمات' : 'Reviews' }),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    ),
                    permission: 'reviews.view'
                }
            ]
        },
        {
            title: isArabic ? 'النقل والتغطية' : 'Transport & Zones',
            items: [
                {
                    to: '/transport-dispatch',
                    label: isArabic ? 'إدارة نقل وتوزيع العاملات' : 'Worker Transport & Dispatch',
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25h-3.375a1.125 1.125 0 00-1.125 1.125v4.125m4.5-5.25v5.25m0 0H7.5" />
                        </svg>
                    ),
                    permission: 'transport_dispatch.view'
                },
                {
                    to: '/drivers',
                    label: isArabic ? 'سائقين النقل' : 'Drivers',
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6 0 3.375 3.375 0 016 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                    ),
                    permission: 'drivers.view'
                },
                {
                    to: '/departure-points',
                    label: isArabic ? 'نقاط الانطلاق' : 'Departure Points',
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                    ),
                    permission: 'departure_points.view'
                },
                {
                    to: '/service-zones',
                    label: isArabic ? 'مناطق التغطية (Geo-fencing)' : 'Service Zones',
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-11.488l4.875 2.437c.381.19.622.58.622 1.006v9.458c0 .812-.86 1.33-1.593.963L15 14.25M9 6.75L3.486 9.507C3.105 9.697 2.864 10.087 2.864 10.513v9.458c0 .812.86 1.33 1.593.963L9 18.75m0-12l6 3m-6 3l6 3" />
                        </svg>
                    ),
                    permission: 'service_zones.view'
                }
            ]
        },
        {
            title: isArabic ? 'التسويق' : 'Marketing',
            items: [
                {
                    to: '/coupons',
                    label: t('sidebar.coupons', { defaultValue: 'Coupons' }),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                    ),
                    permission: 'coupons.view'
                },
                {
                    to: '/points',
                    label: t('sidebar.points', { defaultValue: 'Points' }),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    permission: 'points.view'
                },
                {
                    to: '/banners',
                    label: t('sidebar.banners'),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                    ),
                    permission: 'banners.view'
                },
                {
                    to: '/announcements',
                    label: t('sidebar.announcements'),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                        </svg>
                    ),
                    permission: 'announcements.view'
                },
                {
                    to: '/mobile-notifications',
                    label: t('sidebar.mobile_notifications'),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.07 6.07 0 00-1-3.59V6a3 3 0 00-6 0v1.41A6.07 6.07 0 0010 11v3.159c0 .538-.214 1.055-.595 1.436L8 17h5m4 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    ),
                    permission: 'notifications.view'
                }
            ]
        },
        {
            title: isArabic ? 'الإدارة' : 'Management',
            items: [
                {
                    to: '/employees',
                    label: t('sidebar.employees'),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.073c0 1.313-.953 2.439-2.253 2.632a48.81 48.81 0 01-11.994 0c-1.3-.193-2.253-1.319-2.253-2.632V14.15M8.25 6.75h7.5a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25V9a2.25 2.25 0 012.25-2.25zM9 6.75V5.25A2.25 2.25 0 0111.25 3h1.5A2.25 2.25 0 0115 5.25v1.5" />
                        </svg>
                    ),
                    permission: 'employees.view'
                },
                {
                    to: '/roles',
                    label: t('sidebar.roles'),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    ),
                    permission: 'roles.view'
                },
                {
                    to: '/legal-documents',
                    label: t('sidebar.terms_conditions'),
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    ),
                    permission: 'legal_documents.view'
                }
            ]
        },
        {
            title: isArabic ? 'الإعدادات' : 'Settings',
            items: [
                {
                    to: '/settings/company-info',
                    label: isArabic ? 'بيانات الشركة' : 'Company Info',
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
                        </svg>
                    ),
                    permission: 'location.edit'
                }
            ]
        }
    ];

    // Filter invisible groups
    const renderedGroups = groups.map(group => {
        const visibleItems = group.items.filter(item => {
            if (!item.permission) return true;
            if (Array.isArray(item.permission)) return item.permission.some(p => hasPermission(p));
            return hasPermission(item.permission) || (item.to === '/settings/governorates' && (hasPermission('governorates.view') || hasPermission('governorates.edit')));
        });
        return { ...group, items: visibleItems };
    }).filter(group => group.items.length > 0);

    return (
        <>
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                ></div>
            )}

            <aside className={`
                fixed inset-y-0 ltr:left-0 rtl:right-0 z-30
                bg-white shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] flex flex-col h-screen 
                border-r rtl:border-l rtl:border-r-0 border-gray-100/50 
                transition-all duration-300 ease-in-out
                md:static md:!translate-x-0
                ${isOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'}
                ${isCollapsed ? 'md:w-20 w-64' : 'md:w-72 w-64'}
            `}>
                
                {/* Mobile close button */}
                <button 
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 ltr:right-4 rtl:left-4 md:hidden p-2 text-gray-400 hover:text-[#D94A78] bg-gray-50 hover:bg-rose-50 rounded-xl transition-all duration-200"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header branding */}
                <div className={`border-b border-gray-100/50 flex flex-col items-center justify-center transition-all duration-300 shrink-0 h-20 bg-white ${isCollapsed ? 'p-3' : 'p-6'}`}>
                    {companyData?.logo_url ? (
                        <img 
                            src={companyData.logo_url} 
                            alt="Logo" 
                            className={`object-contain rounded-xl shadow-sm transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'h-10 w-auto'}`}
                        />
                    ) : (
                        <div className={`bg-rose-50 text-[#D94A78] rounded-xl flex items-center justify-center font-extrabold shadow-sm transition-all duration-300 ${isCollapsed ? 'w-10 h-10 text-lg' : 'w-12 h-12 text-2xl'}`}>
                            {companyData ? (isArabic ? companyData.name_ar?.charAt(0) : companyData.name_en?.charAt(0)) : 'Z'}
                        </div>
                    )}
                    {!isCollapsed && companyData?.logo_url === null && (
                        <>
                            <h2 className="text-md font-bold text-gray-800 text-center truncate max-w-full leading-tight">
                                {companyData ? (isArabic ? companyData.name_ar : companyData.name_en) : t('sidebar.title')}
                            </h2>
                            {roleLabel && <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mt-1">{roleLabel}</span>}
                        </>
                    )}
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto custom-scrollbar">
                    {renderedGroups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-1">
                            {!isCollapsed ? (
                                <h3 className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-2">
                                    {group.title}
                                </h3>
                            ) : (
                                <div className="border-t border-gray-100 my-2" />
                            )}
                            
                            {group.items.map((item) => {
                                const active = isActive(item.to);
                                return (
                                    <div key={item.to} className="px-2 mb-1">
                                        <Link
                                            to={item.to}
                                            onClick={handleLinkClick}
                                            className={`w-full justify-start gap-3 relative flex items-center transition-all duration-200 overflow-hidden group ${
                                                active 
                                                ? 'bg-rose-50/70 text-[#D94A78] font-semibold hover:bg-rose-50/70 hover:text-[#D94A78] shadow-sm border border-rose-100/50' 
                                                : 'text-gray-600 hover:bg-rose-50/30 hover:text-[#D94A78]'
                                            } ${
                                                isCollapsed 
                                                ? 'justify-center px-2 h-12 w-12 mx-auto rounded-xl' 
                                                : 'px-4 h-11 rounded-xl'
                                            }`}
                                            title={isCollapsed ? item.label : ''}
                                        >
                                            {/* Left side indicator stripe like Aqar project */}
                                            <div
                                                className={`absolute top-0 bottom-0 w-1 bg-[#D94A78] transition-all duration-300 ${
                                                    isArabic ? 'right-0' : 'left-0'
                                                } ${active ? 'opacity-100' : 'opacity-0'}`}
                                            />
                                            
                                            <span className={`shrink-0 transition-colors ${active ? 'text-[#D94A78]' : 'text-gray-500 group-hover:text-[#D94A78]'}`}>{item.icon}</span>
                                            {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Footer Toggle Button - Like Aqar Project */}
                <div className="border-t border-gray-100/50 p-3 shrink-0 bg-white">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-full h-10 hover:bg-rose-50/50 hover:text-[#D94A78] text-gray-400 rounded-xl transition-all duration-200 flex items-center justify-center border border-gray-100/50"
                        title={isCollapsed ? t('sidebar.expand', { defaultValue: 'Expand' }) : t('sidebar.collapse', { defaultValue: 'Collapse' })}
                    >
                        {isArabic ? (
                            isCollapsed ? (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            ) : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            )
                        ) : isCollapsed ? (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;