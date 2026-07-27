import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const GuestRoute = () => {
  const token = localStorage.getItem('zaina_admin_token');

  // If user is already logged in, redirect them to Dashboard
  if (token) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default GuestRoute;