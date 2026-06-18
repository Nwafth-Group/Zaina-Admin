// Client-side authorization helpers backed by the cached admin user
// (`zaina_admin_user`), refreshed from `GET /admin/me` on load so its `roles`
// and `permissions` reflect the user's live Spatie assignment.
//
// IMPORTANT: authorization is driven by `roles`/`permissions`, NOT the `type`
// column. `type` (super_admin/operation/…) is independent of a user's actual
// role, so it must never decide what the UI exposes. Permissions are derived
// from the user's roles server-side, which makes `hasPermission` role-driven:
// the Super Admin role is granted every permission and therefore passes
// naturally, while an Operations Manager only gets its own.
//
// These checks only drive what the UI shows; every protected action is still
// enforced server-side by the matching `permission:*` middleware.

export function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('zaina_admin_user') || '{}');
    } catch {
        return {};
    }
}

export function getRoles() {
    const { roles } = getCurrentUser();
    return Array.isArray(roles) ? roles : [];
}

export function getPermissions() {
    const { permissions } = getCurrentUser();
    return Array.isArray(permissions) ? permissions : [];
}

/** Whether the current admin holds the given Spatie role (by name). */
export function hasRole(role) {
    return getRoles().includes(role);
}

export function isSuperAdmin() {
    return hasRole('Super Admin');
}

/**
 * Whether the current admin holds the given permission (role-derived). No `type`
 * shortcut — a Super Admin passes because the role carries the permission.
 */
export function hasPermission(permission) {
    return getPermissions().includes(permission);
}
