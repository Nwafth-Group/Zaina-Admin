import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { hasPermission } from '../utils/permissions.js';

/**
 * Route guard that blocks a subtree unless the logged-in admin holds `permission`.
 * Direct URL navigation to a gated page redirects to the dashboard instead of
 * rendering it. The backend still enforces the same permission on every request —
 * this only keeps the UI honest.
 */
const PermissionRoute = ({ permission, redirectTo = '/' }) => {
    return hasPermission(permission) ? <Outlet /> : <Navigate to={redirectTo} replace />;
};

export default PermissionRoute;
