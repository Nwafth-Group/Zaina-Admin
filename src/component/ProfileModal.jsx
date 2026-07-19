import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axiosInstance from '../api/axios.js';

const INPUT = 'w-full px-4 h-11 border border-gray-200 rounded-xl text-sm text-gray-800 bg-[#F8F9FB] focus:bg-white focus:ring-2 focus:ring-[#D94A78] focus:border-[#D94A78] outline-none transition-all duration-200';
const LABEL = 'block text-xs font-bold text-gray-600 mb-1.5';

export default function ProfileModal({ onClose, onUpdated, initialTab = 'account' }) {
    const { t, i18n } = useTranslation('common');
    const [tab, setTab] = useState(initialTab);
    const isArabic = i18n.language?.startsWith('ar');

    // ---- Current profile ----
    const { data: profile, isLoading } = useQuery({
        queryKey: ['my-profile'],
        queryFn: async () => (await axiosInstance.get('/admin/profile')).data.data,
    });

    // ---- Account form ----
    const accountSchema = yup.object().shape({
        first_name: yup.string().required(t('profile.validation_required')),
        last_name: yup.string().required(t('profile.validation_required')),
        email: yup.string().email(t('profile.validation_email')).required(t('profile.validation_required')),
        phone_number: yup.string().required(t('profile.validation_required')),
    });
    const accountForm = useForm({ resolver: yupResolver(accountSchema) });

    useEffect(() => {
        if (profile) {
            accountForm.reset({
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                email: profile.email || '',
                phone_number: profile.mobile_number || '',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile]);

    const accountMutation = useMutation({
        mutationFn: (data) => axiosInstance.put('/admin/profile', data),
        onSuccess: (response) => {
            const updated = response.data?.data;
            toast.success(response.data?.message || t('profile.account_updated'));
            // Keep the cached admin (header name/email) in sync.
            try {
                const stored = JSON.parse(localStorage.getItem('zaina_admin_user') || '{}');
                localStorage.setItem('zaina_admin_user', JSON.stringify({ ...stored, name: updated?.full_name, email: updated?.email }));
            } catch (e) { /* ignore */ }
            if (updated?.full_name) onUpdated?.(updated.full_name);
            onClose();
        },
        onError: (error) => {
            const params = error.response?.data?.errors || error.response?.data?.params;
            if (params) {
                Object.entries(params).forEach(([field, messages]) => {
                    const message = Array.isArray(messages) ? messages[0] : messages;
                    accountForm.setError(field, { message });
                });
            }
            toast.error(error.response?.data?.message || t('profile.error') || 'Validation failed');
        },
    });

    // ---- Password form ----
    const passwordSchema = yup.object().shape({
        current_password: yup.string().required(t('profile.validation_required')),
        password: yup.string().required(t('profile.validation_required')).min(8, t('profile.validation_min')),
        password_confirmation: yup.string().oneOf([yup.ref('password')], t('profile.validation_match')).required(t('profile.validation_required')),
    });
    const passwordForm = useForm({ resolver: yupResolver(passwordSchema) });

    const passwordMutation = useMutation({
        mutationFn: (data) => axiosInstance.put('/admin/profile/password', data),
        onSuccess: (response) => {
            toast.success(response.data?.message || t('profile.password_changed'));
            passwordForm.reset({ current_password: '', password: '', password_confirmation: '' });
            onClose();
        },
        onError: (error) => {
            const params = error.response?.data?.errors || error.response?.data?.params;
            if (params) {
                Object.entries(params).forEach(([field, messages]) => {
                    const message = Array.isArray(messages) ? messages[0] : messages;
                    passwordForm.setError(field, { message });
                });
            }
            toast.error(error.response?.data?.message || t('profile.error') || 'Validation failed');
        },
    });

    const tabClass = (key) =>
        `px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
            tab === key 
                ? 'bg-rose-50 text-[#D94A78] shadow-sm border border-rose-100' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
        }`;

    const Err = ({ form, name }) => {
        const msg = form.formState.errors[name]?.message;
        return msg ? <p className="text-red-500 text-xs mt-1 px-1 font-medium">{msg}</p> : null;
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-main">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative border border-gray-100 animate-in zoom-in-95 duration-200">
                {/* Header with Avatar & Meta */}
                <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#E91E63] to-[#F4A9BC] text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                        {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'Z'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-800 truncate">{profile?.full_name || t('profile.title')}</h3>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{profile?.email}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors p-1 bg-white hover:bg-red-50 rounded-lg border border-gray-100 flex items-center justify-center" aria-label={t('profile.cancel')}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1.5 px-6 pt-4 pb-2 bg-white">
                    <button onClick={() => setTab('account')} className={tabClass('account')}>{t('profile.tab_account')}</button>
                    <button onClick={() => setTab('password')} className={tabClass('password')}>{t('profile.tab_password')}</button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center gap-3 py-16 text-gray-500">
                        <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                        <span className="text-sm font-medium">{t('profile.loading')}</span>
                    </div>
                ) : tab === 'account' ? (
                    <form onSubmit={accountForm.handleSubmit((d) => accountMutation.mutate(d))} className="p-6 pt-2 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL}>{t('profile.first_name')}</label>
                                <input {...accountForm.register('first_name')} className={`${INPUT} ${accountForm.formState.errors.first_name ? 'border-red-500' : 'border-gray-200'}`} />
                                <Err form={accountForm} name="first_name" />
                            </div>
                            <div>
                                <label className={LABEL}>{t('profile.last_name')}</label>
                                <input {...accountForm.register('last_name')} className={`${INPUT} ${accountForm.formState.errors.last_name ? 'border-red-500' : 'border-gray-200'}`} />
                                <Err form={accountForm} name="last_name" />
                            </div>
                        </div>
                        <div>
                            <label className={LABEL}>{t('profile.email')}</label>
                            <input type="email" dir="ltr" {...accountForm.register('email')} className={`${INPUT} text-left ${accountForm.formState.errors.email ? 'border-red-500' : 'border-gray-200'}`} />
                            <Err form={accountForm} name="email" />
                        </div>
                        <div>
                            <label className={LABEL}>{t('profile.phone')}</label>
                            <input dir="ltr" {...accountForm.register('phone_number')} className={`${INPUT} text-left ${accountForm.formState.errors.phone_number ? 'border-red-500' : 'border-gray-200'}`} />
                            <Err form={accountForm} name="phone_number" />
                        </div>
                        <div className="pt-2 flex gap-3 justify-end">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm">{t('profile.cancel')}</button>
                            <button type="submit" disabled={accountMutation.isPending} className="px-5 py-2.5 rounded-full bg-[#E91E63] text-white hover:bg-[#D81B60] font-medium transition-colors text-sm flex items-center justify-center gap-2 min-w-[120px]">
                                {accountMutation.isPending && (
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                )}
                                {t('profile.save')}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate(d))} className="p-6 pt-2 space-y-4">
                        <div>
                            <label className={LABEL}>{t('profile.current_password')}</label>
                            <input type="password" {...passwordForm.register('current_password')} className={`${INPUT} ${passwordForm.formState.errors.current_password ? 'border-red-500' : 'border-gray-200'}`} />
                            <Err form={passwordForm} name="current_password" />
                        </div>
                        <div>
                            <label className={LABEL}>{t('profile.new_password')}</label>
                            <input type="password" {...passwordForm.register('password')} className={`${INPUT} ${passwordForm.formState.errors.password ? 'border-red-500' : 'border-gray-200'}`} />
                            <Err form={passwordForm} name="password" />
                        </div>
                        <div>
                            <label className={LABEL}>{t('profile.confirm_password')}</label>
                            <input type="password" {...passwordForm.register('password_confirmation')} className={`${INPUT} ${passwordForm.formState.errors.password_confirmation ? 'border-red-500' : 'border-gray-200'}`} />
                            <Err form={passwordForm} name="password_confirmation" />
                        </div>
                        <div className="pt-2 flex gap-3 justify-end">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm">{t('profile.cancel')}</button>
                            <button type="submit" disabled={passwordMutation.isPending} className="px-5 py-2.5 rounded-full bg-[#E91E63] text-white hover:bg-[#D81B60] font-medium transition-colors text-sm flex items-center justify-center gap-2 min-w-[120px]">
                                {passwordMutation.isPending && (
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                )}
                                {t('profile.save')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
