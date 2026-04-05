import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const AdminLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50 text-right" dir="rtl">
      {/* Sidebar ثابت */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b text-center">
          <h2 className="text-2xl font-bold text-[#E91E63]">زينة للخدمات</h2>
          <p className="text-sm text-gray-500">بوابة المشرف العام</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className="block p-3 rounded-lg hover:bg-[#FDF0F3] hover:text-[#E91E63] transition-colors text-gray-700 font-medium">لوحة التحكم</Link>
          <Link to="/operations" className="block p-3 rounded-lg hover:bg-[#FDF0F3] hover:text-[#E91E63] transition-colors text-gray-700 font-medium">إدارة العمليات (Operations)</Link>
        </nav>
      </aside>

      {/* Main Content Area اللي بيتغير */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">مرحباً بك، سوبر أدمن</h1>
          <button className="text-red-500 hover:text-red-700 font-medium">تسجيل الخروج</button>
        </header>
        
        <div className="p-6">
          {/* Outlet هون رح يعرض محتوى الـ Dashboard أو الـ Operations بناءً على الرابط */}
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;