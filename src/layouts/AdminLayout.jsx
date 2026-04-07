import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../component/LanguageSwitcher.jsx';

import Sidebar from '../component/Sidebar.jsx';

const AdminLayout = () => {
  const { t } = useTranslation('common');
  const [adminName, setAdminName] = useState('');

  // جلب اسم الأدمن من التخزين المحلي عند تحميل الهيكل
  useEffect(() => {
    const userString = localStorage.getItem('zaina_admin_user');
    if (userString) {
      console.log("Admin user data found in localStorage:", userString);
      try {
        const user = JSON.parse(userString);
        setAdminName(user.name);
      } catch (error) {
        console.error("Error parsing user data", error);
      }
    }
  }, []);

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden font-main">
      
      {/* استدعاء مكون القائمة الجانبية */}
      <Sidebar />

      {/* المحتوى الرئيسي */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* الترويسة العلوية (Header) */}
        <header className="bg-white shadow-sm p-4 flex justify-between items-center px-8 border-b border-gray-100 z-10">
          <div className="flex items-center gap-4">
             {/* مساحة يمكن وضع مسار الصفحة فيها (Breadcrumbs) لاحقاً */}
             <h1 className="text-xl font-bold text-gray-800 hidden md:block">
               {t('sidebar.title')}
             </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <LanguageSwitcher />
            
            {/* معلومات المستخدم */}
            <div className="flex items-center gap-3 border-l rtl:border-l-0 rtl:border-r border-gray-200 pl-4 rtl:pr-4 rtl:pl-0">
              <div className="text-right rtl:text-left hidden sm:block">
                <p className="text-sm font-bold text-gray-800">{adminName || t('header.super_admin')}</p>
                <p className="text-xs text-gray-500">{t('header.welcome')}</p>
              </div>
              
              {/* صورة رمزية أو الحرف الأول من اسم الأدمن */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#E91E63] to-[#F4A9BC] text-white flex items-center justify-center font-bold shadow-md text-lg">
                {adminName ? adminName.charAt(0).toUpperCase() : 'Z'}
              </div>
            </div>
          </div>
        </header>
        
        {/* منطقة عرض الصفحات (Outlet) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;