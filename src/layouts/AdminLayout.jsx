import React, { useEffect, useState, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import axiosInstance from '../api/axios.js';
import LanguageSwitcher from '../component/LanguageSwitcher.jsx';
import Sidebar from '../component/Sidebar.jsx';
import ProfileModal from '../component/ProfileModal.jsx';
import UserMenu from '../component/UserMenu.jsx';

const AdminLayout = () => {
  const { t, i18n } = useTranslation('common');
  const isArabic = i18n.language?.startsWith('ar');
  const [adminName, setAdminName] = useState('');
  const [adminRoles, setAdminRoles] = useState([]);
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
        setAdminRoles(user.roles || []);
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

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const queryClient = useQueryClient();

  const lastNotifIdRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  const { data: adminNotifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/admin/me/notifications');
        const list = res.data.data || [];

        if (list.length > 0) {
          const latest = list[0];
          if (isFirstLoadRef.current) {
            lastNotifIdRef.current = latest.id;
            isFirstLoadRef.current = false;
          } else if (lastNotifIdRef.current && lastNotifIdRef.current !== latest.id && !latest.read_at) {
            lastNotifIdRef.current = latest.id;

            // Trigger Real-Time Toast Alert
            const details = latest.data || {};
            const title = details.title || (isArabic ? 'إشعار جديد' : 'New Notification');
            const message = details.message || details.body || details.description || '';

            toast(
              (t) => (
                <div
                  onClick={() => {
                    toast.dismiss(t.id);
                    setIsNotifOpen(true);
                  }}
                  className="flex items-start gap-3 w-full cursor-pointer select-none bg-white"
                  style={{
                    direction: isArabic ? 'rtl' : 'ltr',
                    textAlign: isArabic ? 'right' : 'left',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 leading-snug">
                      {title}
                    </p>
                    {message && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                        {message}
                      </p>
                    )}
                    <span className="text-[11px] text-[#D94A78] font-semibold mt-1.5 inline-block">
                      {isArabic ? 'انقر لعرض الإشعارات' : 'Click to view'}
                    </span>
                  </div>
                </div>
              ),
              {
                icon: '🔔',
                duration: 6000,
                position: isArabic ? 'top-left' : 'top-right',
                style: {
                  background: '#ffffff',
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  border: '1px solid #e5e7eb',
                  borderRight: isArabic ? '4px solid #D94A78' : '1px solid #e5e7eb',
                  borderLeft: !isArabic ? '4px solid #D94A78' : '1px solid #e5e7eb',
                  borderRadius: '16px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                  padding: '14px 18px',
                  minWidth: '320px',
                  maxWidth: '420px',
                  opacity: 1,
                  zIndex: 99999,
                },
              }
            );
          }
        } else if (isFirstLoadRef.current) {
          isFirstLoadRef.current = false;
        }

        return list;
      } catch {
        return [];
      }
    },
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      return axiosInstance.post('/admin/me/notifications/read');
    },
    onSuccess: () => {
      refetchNotifications();
    },
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
      if (me.roles) setAdminRoles(me.roles);
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

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 text-gray-500 hover:text-[#D94A78] hover:bg-rose-50/40 active:scale-95 rounded-xl transition-all duration-200 focus:outline-none flex items-center justify-center cursor-pointer select-none"
                title={isArabic ? 'الإشعارات' : 'Notifications'}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {adminNotifications.filter(n => !n.read_at).length > 0 && (
                  <span className="absolute -top-1 -right-1 flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm shadow-red-500/20 animate-pulse border-2 border-white">
                    {adminNotifications.filter(n => !n.read_at).length}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className={`absolute ${isArabic ? 'left-0' : 'right-0'} mt-2 w-80 sm:w-96 overflow-hidden rounded-2xl border border-gray-100 bg-white p-0 shadow-xl animate-fade-in-up origin-top-right z-50`}>
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 bg-gray-50/50 border-b border-gray-100 select-none">
                    <span className="text-sm font-bold text-gray-800">
                      {isArabic ? 'الإشعارات' : 'Notifications'}
                    </span>
                    {adminNotifications.filter(n => !n.read_at).length > 0 && (
                      <button
                        onClick={() => markReadMutation.mutate()}
                        disabled={markReadMutation.isPending}
                        className="flex items-center gap-1 text-xs font-semibold text-[#D94A78] hover:text-[#c43662] transition-colors disabled:opacity-50 cursor-pointer bg-transparent border-0 p-0"
                      >
                        {markReadMutation.isPending ? (
                          <svg className="animate-spin h-3.5 w-3.5 text-[#D94A78]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        <span>{isArabic ? 'تعيين الكل كمقروء' : 'Mark all as read'}</span>
                      </button>
                    )}
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-80 overflow-y-auto flex flex-col gap-0 select-none">
                    {adminNotifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 italic text-sm">
                        {isArabic ? 'لا توجد إشعارات جديدة' : 'No new notifications'}
                      </div>
                    ) : (
                      adminNotifications.map((notif) => {
                        const details = notif.data || {};
                        return (
                          <div
                            key={notif.id}
                            className={`p-4 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors relative flex flex-col gap-1 ${
                              !notif.read_at ? "bg-rose-50/10" : ""
                            }`}
                          >
                            {!notif.read_at && (
                              <div className="absolute top-5 start-3 w-2 h-2 rounded-full bg-[#D94A78]" />
                            )}

                            <div className={`flex flex-col gap-1 ms-5 flex-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                              <div className="flex items-start justify-between gap-2 w-full">
                                <span className={`text-sm font-semibold leading-tight ${!notif.read_at ? 'text-gray-800' : 'text-gray-500 font-normal'}`}>
                                  {details.title || (isArabic ? 'إشعار جديد' : 'New Notification')}
                                </span>
                                <span className="text-[10px] text-gray-400 shrink-0 flex items-center gap-0.5 select-none font-semibold">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {new Date(notif.created_at).toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className={`text-xs ${!notif.read_at ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                                {details.body || details.message || ''}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* معلومات المستخدم — قائمة منسدلة عند المرور بالماوس */}
            <UserMenu adminName={adminName} adminRoles={adminRoles} onOpenProfile={(tab) => setProfileTab(tab)} />
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