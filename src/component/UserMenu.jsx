import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axios';

/**
 * Header user chip with a hover dropdown: update profile, change password, and
 * logout. Opens on mouse-over (and click, for touch). The logout flow lives here
 * now that it was moved out of the sidebar.
 */
export default function UserMenu({ adminName, adminRoles = [], onOpenProfile }) {
    const { t } = useTranslation('common');
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const logoutMutation = useMutation({
        mutationFn: () => axiosInstance.post('/admin/auth/logout'),
        onSettled: () => {
            localStorage.removeItem('zaina_admin_token');
            localStorage.removeItem('zaina_admin_user');
            queryClient.clear();
            navigate('/auth/login', { replace: true });
        },
    });

    const openProfile = (tab) => {
        setOpen(false);
        onOpenProfile(tab);
    };

    const itemClass = 'flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#FDF0F3] hover:text-[#E91E63] transition-colors';

    return (
        <div
            className="relative"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-3 border-l rtl:border-l-0 rtl:border-r border-gray-200 pl-4 rtl:pr-4 rtl:pl-0 hover:opacity-80 transition-opacity focus:outline-none"
            >
                <div className="text-right rtl:text-left hidden sm:block">
                    <p className="text-sm font-bold text-gray-800">{adminName || t('header.super_admin')}</p>
                    <p className="text-xs text-gray-400 font-medium leading-none mt-0.5">
                        {adminRoles && adminRoles.length > 0 
                            ? adminRoles.map(r => t(`roles.${r}`, { defaultValue: r })).join(', ') 
                            : t('header.welcome')}
                    </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#E91E63] to-[#F4A9BC] text-white flex items-center justify-center font-bold shadow-md text-lg">
                    {adminName ? adminName.charAt(0).toUpperCase() : 'Z'}
                </div>
            </button>

            {/* Dropdown — `top-full` + transparent `pt-2` bridges the gap so the
                menu stays open while moving the pointer onto it. */}
            <div
                className={`absolute end-0 top-full pt-2 w-56 z-50 transition-all duration-150 ${open ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 pointer-events-none'}`}
            >
                <div className="rounded-xl bg-white shadow-lg border border-gray-100 py-2 overflow-hidden">
                    <button type="button" onClick={() => openProfile('account')} className={itemClass}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {t('user_menu.update_profile')}
                    </button>

                    <button type="button" onClick={() => openProfile('password')} className={itemClass}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        {t('user_menu.change_password')}
                    </button>

                    <hr className="my-2 border-gray-100" />

                    <button
                        type="button"
                        onClick={() => logoutMutation.mutate()}
                        disabled={logoutMutation.isPending}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                        {logoutMutation.isPending ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        )}
                        {logoutMutation.isPending ? t('sidebar.logout_loading') : t('sidebar.logout')}
                    </button>
                </div>
            </div>
        </div>
    );
}
