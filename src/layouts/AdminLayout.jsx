import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axios.js';
import LanguageSwitcher from '../component/LanguageSwitcher.jsx';
import Sidebar from '../component/Sidebar.jsx';
import ProfileModal from '../component/ProfileModal.jsx';
import UserMenu from '../component/UserMenu.jsx';

const AdminLayout = () => {
  const { t, i18n } = useTranslation('common');
  const isArabic = i18n.language?.startsWith('ar');
  const [adminName, setAdminName] = useState('');
  // Bumped whenever the cached user is refreshed, to force the sidebar to
  // re-evaluate permission-gated links against the fresh data.
  const [authVersion, setAuthVersion] = useState(0);

  // حالة للتحكم بفتح وإغلاق القائمة الجانبية على شاشات الموبايل
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Desktop sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  
  // null = closed; otherwise the tab to open the profile modal on.
  const [profileTab, setProfileTab] = useState(null);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  // جلب اسم الأدمن من التخزين المحلي عند تحميل الهيكل
  useEffect(() => {
    const userString = localStorage.getItem('zaina_admin_user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        setAdminName(user.name);
      } catch (error) {
        console.error("Error parsing user data", error);
      }
    }
  }, []);

  // Refresh the cached identity/roles/permissions from the server on load so
  // the UI reflects the actually-logged-in account (e.g. an operations user
  // never sees Super-Admin-only links from a stale login snapshot).
  const { data: me } = useQuery({
    queryKey: ['current-admin'],
    queryFn: async () => (await axiosInstance.get('/admin/me')).data.data,
    staleTime: 0,
    retry: false,
  });

  // Fetch company info dynamically for header and sidebar branding
  const { data: companyData } = useQuery({
    queryKey: ['companyInfo'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/company-info');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  useEffect(() => {
    if (!me) return;
    try {
      const stored = JSON.parse(localStorage.getItem('zaina_admin_user') || '{}');
      localStorage.setItem('zaina_admin_user', JSON.stringify({
        ...stored,
        type: me.type,
        roles: me.roles,
        permissions: me.permissions,
        name: me.name ?? stored.name,
        email: me.email ?? stored.email,
      }));
      if (me.name) setAdminName(me.name);
      setAuthVersion((v) => v + 1);
    } catch (error) {
      console.error("Error syncing current admin", error);
    }
  }, [me]);

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden font-main" dir={isArabic ? 'rtl' : 'ltr'}>
      
      {/* تمرير خصائص الفتح والإغلاق للسايدبار */}
      {/* key forces a re-render once the cached permissions or logo updates */}
      <Sidebar 
        key={`${authVersion}-${companyData?.logo_url || ''}-${companyData?.name_en || ''}`} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        companyData={companyData}
      />

      {/* المحتوى الرئيسي */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        
        {/* الترويسة العلوية (Header) - Glassmorphism style */}
        <header className="backdrop-blur-md bg-white/80 shadow-sm p-4 flex justify-between items-center px-4 md:px-8 border-b border-gray-100 z-10 transition-all duration-300">
          <div className="flex items-center gap-4">
             {/* زر فتح / إغلاق القائمة الجانبية (للموبايل والديسك توب) */}
             <button 
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setIsSidebarOpen(true);
                  } else {
                    toggleSidebar();
                  }
                }}
                className="md:hidden p-2 text-gray-600 hover:text-[#D94A78] hover:bg-rose-50 border border-gray-100 rounded-xl transition-all duration-200 focus:outline-none flex items-center justify-center shadow-sm"
                title={isCollapsed ? t('sidebar.expand', { defaultValue: 'Expand Sidebar' }) : t('sidebar.collapse', { defaultValue: 'Collapse Sidebar' })}
             >
                {isCollapsed ? (
                  <svg className={`w-5 h-5 transition-transform duration-300 ${isArabic ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                ) : (
                  <svg className={`w-5 h-5 transition-transform duration-300 ${isArabic ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                  </svg>
                )}
             </button>

             <h1 className="text-lg font-bold text-gray-800 hidden sm:block">
               {companyData ? (isArabic ? companyData.name_ar : companyData.name_en) : t('sidebar.title')}
             </h1>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
            <LanguageSwitcher />

            {/* معلومات المستخدم — قائمة منسدلة عند المرور بالماوس */}
            <UserMenu adminName={adminName} onOpenProfile={(tab) => setProfileTab(tab)} />
          </div>
        </header>
        
        {/* منطقة عرض الصفحات (Outlet) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {profileTab && (
        <ProfileModal
          initialTab={profileTab}
          onClose={() => setProfileTab(null)}
          onUpdated={(name) => setAdminName(name)}
        />
      )}
    </div>
  );
};

export default AdminLayout;