import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  // بنجيب التوكن من التخزين المحلي
  const token = localStorage.getItem('zaina_admin_token');

  // إذا ما في توكن، حوله فورا على صفحة تسجيل الدخول
  if (!token) {
    // replace بتمنع اليوزر إنه يرجع للصفحة المحمية لو ضغط زر "Back" في المتصفح
    return <Navigate to="/auth/login" replace />;
  }

  // إذا في توكن، اسمح له يدخل ويكمل (Outlet بتعرض الـ Layout والصفحات اللي جواته)
  return <Outlet />;
};

export default ProtectedRoute;