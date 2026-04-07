import React from 'react';
import { Outlet } from 'react-router-dom';
import LanguageSwitcher from '../component/LanguageSwitcher.jsx';

const AuthLayout = () => {
  return (
    // Outlet هو المكان اللي رح تنعرض فيه الـ LoginPage
   <div className="relative min-h-screen bg-[#FDF0F3]">
      {/* المبدّل يظهر فوق في الزاوية */}
      <div className="absolute top-6 left-6 right-6 flex justify-end z-50">
        <LanguageSwitcher />
      </div>
      <Outlet />
    </div>
  );
};

export default AuthLayout;