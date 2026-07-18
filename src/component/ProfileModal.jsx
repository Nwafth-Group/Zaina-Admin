import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axiosInstance from '../api/axios.js';

const INPUT = 'w-full px-4 h-[72px] border border-[#D94A78] rounded-[24px] text-gray-800 bg-[#F8F9FB] focus:bg-white focus:ring-2 focus:ring-[#D94A78] outline-none transition-all';
const LABEL = 'block text-sm font-medium text-gray-700 mb-1.5';

export default function ProfileModal({ onClose, onUpdated, initialTab = 'account' }) {
    const { t } = useTranslation('common');
    const [tab, setTab] = useState(initialTab);

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
        },
        onError: (error) => {
            const params = error.response?.data?.params;
            if (params) Object.entries(params).forEach(([field, message]) => accountForm.setError(field, { message }));
            else toast.error(error.response?.data?.message || t('profile.error'));
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
        },
        onError: (error) => {
            const params = error.response?.data?.params;
            if (params) Object.entries(params).forEach(([field, message]) => passwordForm.setError(field, { message }));
            else toast.error(error.response?.data?.message || t('profile.error'));
        },
    });

    const tabClass = (key) =>
        `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-[#E91E63] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`;

    const Err = ({ form, name }) => {
        const msg = form.formState.errors[name]?.message;
        return msg ? <p className="text-red-500 text-xs mt-1 px-1">{msg}</p> : null;
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 font-main">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-800">{t('profile.title')}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors" aria-label={t('profile.cancel')}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-6 pt-4">
                    <button onClick={() => setTab('account')} className={tabClass('account')}>{t('profile.tab_account')}</button>
                    <button onClick={() => setTab('password')} className={tabClass('password')}>{t('profile.tab_password')}</button>
                </div>

                {isLoading ? (
                    <div className="p-10 text-center text-gray-500">{t('profile.loading')}</div>
                ) : tab === 'account' ? (
                    <form onSubmit={accountForm.handleSubmit((d) => accountMutation.mutate(d))} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
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
                        <div className="pt-2 flex gap-3 rtl:flex-row-reverse justify-end">
                            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors">{t('profile.cancel')}</button>
                            <button type="submit" disabled={accountMutation.isPending} className="px-6 py-2.5 rounded-xl font-medium text-white bg-[#E91E63] hover:bg-[#D81B60] transition-colors disabled:opacity-70 min-w-[120px]">
                                {accountMutation.isPending ? '…' : t('profile.save')}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate(d))} className="p-6 space-y-4">
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
                        <div className="pt-2 flex gap-3 rtl:flex-row-reverse justify-end">
                            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors">{t('profile.cancel')}</button>
                            <button type="submit" disabled={passwordMutation.isPending} className="px-6 py-2.5 rounded-xl font-medium text-white bg-[#E91E63] hover:bg-[#D81B60] transition-colors disabled:opacity-70 min-w-[120px]">
                                {passwordMutation.isPending ? '…' : t('profile.save')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
