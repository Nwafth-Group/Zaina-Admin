// Lightweight client-side permission helpers backed by the cached admin user
// (`zaina_admin_user`), whose `permissions` array is captured at login. These
// only drive what the UI shows — every protected action is still enforced
// server-side by the matching `permission:*` middleware.

export function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('zaina_admin_user') || '{}');
    } catch {
        return {};
    }
}

export function isSuperAdmin() {
    return getCurrentUser()?.type === 'super_admin';
}

/**
 * Whether the current admin holds the given permission. Super Admins can do
 * everything in the panel, so they always pass.
 */
export function hasPermission(permission) {
    if (isSuperAdmin()) return true;
    const { permissions } = getCurrentUser();
    return Array.isArray(permissions) && permissions.includes(permission);
}
