import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    // Outlet هو المكان اللي رح تنعرض فيه الـ LoginPage
    <div className="auth-layout-container">
      <Outlet /> 
    </div>
  );
};

export default AuthLayout;