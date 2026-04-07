import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const GuestRoute = () => {
  const token = localStorage.getItem('zaina_admin_token');

  // إذا اليوزر مسجل دخوله (عنده توكن) وحاول يفتح /auth، حوله عالرئيسية
  if (token) {
    return <Navigate to="/" replace />;
  }

  // إذا ما عنده توكن، خليه يفتح صفحة تسجيل الدخول براحته
  return <Outlet />;
};

export default GuestRoute;