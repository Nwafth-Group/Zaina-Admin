import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const token = localStorage.getItem('zaina_admin_token');

  if (!token) {
    return <Navigate to="/admin/auth/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;