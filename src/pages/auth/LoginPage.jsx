import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axios';
import heroImage from '../../assets/hero.png';

// استدعاء مكتبات الفورم والتحقق
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

export default function LoginPage() {
    const { t, i18n } = useTranslation('auth'); 
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const isRtl = i18n.language?.startsWith('ar');

    // Build the dynamic Logo URL from the backend server
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const backendUrl = apiBase.replace('/api/v1/', '').replace('/api/v1', '');
    const logoUrl = `${backendUrl}/assist/logo/logo.webp`;

    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    const whiteLogoUrl = `${cleanBase}logo/white_logo.png`;

    // 1. بناء قواعد التحقق (Schema) باستخدام Yup
    const schema = yup.object().shape({
        email: yup
            .string()
            .required(t('validation_email_required'))
            .email(t('validation_email_invalid')),
        password: yup
            .string()
            .required(t('validation_password_required')),
    });

    // 2. تهيئة React Hook Form
    const { 
        register, 
        handleSubmit, 
        formState: { errors } 
    } = useForm({
        resolver: yupResolver(schema),
    });

    // 3. إعداد الـ Mutation
    const loginMutation = useMutation({
        mutationFn: (credentials) => {
            return axiosInstance.post('/admin/auth/login', credentials);
        },
        onSuccess: (response) => {
            const { token, admin } = response.data.data;
            const message = response.data.message; 
            
            if (token) {
                localStorage.setItem('zaina_admin_token', token);
                localStorage.setItem('zaina_admin_user', JSON.stringify(admin));
                queryClient.invalidateQueries({ queryKey: ['user'] });
                
                setSuccessMessage(message);
                setErrorMessage('');
                
                setTimeout(() => {
                    navigate('/', { replace: true }); 
                }, 1000);
            }
        },
        onError: (error) => {
            const emailError = error.response?.data?.params?.email;
            const generalMessage = error.response?.data?.message;

            console.log('Login Error Data:', error.response?.data); 
            
            setSuccessMessage(''); 

            const serverMessage = emailError || generalMessage || 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.';
            setErrorMessage(serverMessage);
        }
    });

    const onSubmit = (data) => {
        setErrorMessage('');
        loginMutation.mutate(data);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-main" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="grid grid-cols-1 lg:grid-cols-2 w-full">
                
                {/* Left Panel: Login Form */}
                <div className="col-span-1 flex flex-col justify-center p-8 sm:p-12 bg-white relative z-10 shadow-2xl">
                    <div className="max-w-md w-full mx-auto space-y-8">
                        {/* Logo & Welcome Header */}
                        <div className="text-center">
                            <h1 className="text-3xl font-extrabold text-[#212121] tracking-tight mb-2">
                                {isRtl ? 'نظام زينة' : 'Ziena System'}
                            </h1>
                            <p className="text-sm text-slate-500 font-medium">
                                {t('subtitle') || (isRtl ? 'أهلاً بك مجدداً! يرجى تسجيل الدخول إلى حسابك.' : 'Welcome back! Please login to your account.')}
                            </p>
                        </div>

                        {/* Error and Success Notifications */}
                        {errorMessage && (
                            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-sm text-center font-medium animate-shake">
                                {errorMessage}
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl text-sm text-center font-medium animate-pulse">
                                {successMessage}
                            </div>
                        )}

                        {/* Login Form */}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Email Field */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 px-1">
                                    {isRtl ? 'البريد الإلكتروني' : 'Email Address'}
                                </label>
                                <div className="relative">
                                    <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none text-slate-400`}>
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                        </svg>
                                    </div>
                                    <input
                                        type="email"
                                        placeholder={t('email_placeholder') || 'admin@ziena.com'}
                                        {...register('email')}
                                        className={`w-full ${isRtl ? 'pl-4 pr-12' : 'pl-12 pr-4'} py-4 bg-slate-50 border rounded-2xl text-[#212121] placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none transition-all duration-200 ${
                                            errors.email ? 'border-red-400 focus:ring-red-400' : 'border-slate-200'
                                        }`}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-red-500 text-xs mt-2 px-2 font-medium">{errors.email.message}</p>
                                )}
                            </div>
                            
                            {/* Password Field */}
                            <div>
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        {isRtl ? 'كلمة المرور' : 'Password'}
                                    </label>
                                </div>
                                <div className="relative">
                                    <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none text-slate-400`}>
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder={t('password_placeholder') || '••••••••'}
                                        {...register('password')}
                                        className={`w-full ${isRtl ? 'pl-4 pr-12' : 'pl-12 pr-4'} py-4 bg-slate-50 border rounded-2xl text-[#212121] placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none transition-all duration-200 ${
                                            errors.password ? 'border-red-400 focus:ring-red-400' : 'border-slate-200'
                                        }`}
                                    />
                                    {/* Password Toggle Button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={`absolute inset-y-0 ${isRtl ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center text-slate-400 hover:text-slate-600 transition-colors`}
                                    >
                                        {showPassword ? (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-red-500 text-xs mt-2 px-2 font-medium">{errors.password.message}</p>
                                )}
                            </div>
                            
                            {/* Submit Button */}
                            <div>
                                <button 
                                    type="submit" 
                                    disabled={loginMutation.isPending || !!successMessage}
                                    className="w-full py-4 text-white rounded-2xl text-md font-semibold hover:opacity-90 focus:outline-none transition-all duration-200 disabled:opacity-70 flex justify-center items-center shadow-lg shadow-rose-100"
                                    style={{ background: 'linear-gradient(135deg, #F45B8C 0%, #FF8FA3 100%)' }}
                                >
                                    {loginMutation.isPending ? (
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        t('submit_button') || (isRtl ? 'تسجيل الدخول' : 'Sign In')
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                </div>

                {/* Right Panel: Immersive Brand Cover */}
                <div 
                    className="hidden lg:flex col-span-1 relative items-center justify-center overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #F45B8C 0%, #FF8FA3 100%)' }}
                >
                    {/* Centered White Brand Logo */}
                    <div className="relative z-10 p-12 flex flex-col items-center justify-center">
                        <img 
                            src={whiteLogoUrl} 
                            alt="Ziena Logo" 
                            className="h-64 object-contain filter drop-shadow-xl hover:scale-105 transition-transform duration-500" 
                        />
                    </div>

                    {/* Subtle decorative circles */}
                    <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-white/10 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-white/10 blur-3xl pointer-events-none" />
                </div>

            </div>
        </div>
    );
}