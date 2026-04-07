import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axios';

// استدعاء مكتبات الفورم والتحقق
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

export default function LoginPage() {
    const { t, i18n } = useTranslation('auth'); 
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState(''); // حالة لرسالة النجاح

    // 1. بناء قواعد التحقق (Schema) باستخدام Yup
    // وضعناها داخل الـ Component لكي نستطيع استخدام دالة الترجمة t()
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
        register, // لربط الحقول (Inputs)
        handleSubmit, // للتعامل مع الإرسال
        formState: { errors } // لالتقاط وعرض أخطاء Yup
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
            const message = response.data.message; // رسالة السيرفر: "تم تسجيل الدخول بنجاح"
            
            if (token) {
                localStorage.setItem('zaina_admin_token', token);
                localStorage.setItem('zaina_admin_user', JSON.stringify(admin));
                queryClient.invalidateQueries({ queryKey: ['user'] });
                
                // عرض رسالة النجاح وإخفاء أي رسالة خطأ سابقة
                setSuccessMessage(message);
                setErrorMessage('');
                
                // تأخير التوجيه لمدة 1 ثانية (1000 ملي ثانية)
                setTimeout(() => {
                    navigate('/', { replace: true }); 
                }, 1000);
            }
        },
        onError: (error) => {
            // فحص آمن باستخدام ?. لمنع انهيار الجافاسكربت
            const emailError = error.response?.data?.params?.email;
            const generalMessage = error.response?.data?.message;

            console.log('Login Error Data:', error.response?.data); // طباعة آمنة
            
            setSuccessMessage(''); // تصفير رسالة النجاح احتياطاً

            // إذا في خطأ مخصص للإيميل اعرضه، وإلا اعرض الرسالة العامة، وإلا اعرض رسالة افتراضية
            const serverMessage = emailError || generalMessage || 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.';

            setErrorMessage(serverMessage);
        }
    });

    // 4. الدالة التي سيتم استدعاؤها إذا مرّت بيانات الفورم بنجاح من Yup
    const onSubmit = (data) => {
        console.log('Form Data:', data);
        setErrorMessage('');
        loginMutation.mutate(data);
    };

    return (
        <div className="min-h-screen bg-[#FDF0F3] flex items-center justify-center font-main relative"> 
            <div className="bg-white p-12 rounded-[24px] shadow-lg w-[450px]">
                <h1 className="text-3xl font-bold text-center text-[#212121] mb-2">{t('title')}</h1>
                <p className="text-center text-[#616161] mb-10">{t('subtitle')}</p>
                
                {/* عرض رسالة الخطأ من السيرفر (أحمر) */}
                {errorMessage && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm text-center font-medium">
                        {errorMessage}
                    </div>
                )}

                {/* عرض رسالة النجاح من السيرفر (أخضر) */}
                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm text-center font-medium">
                        {successMessage}
                    </div>
                )}

                {/* ربط handleSubmit بالفورم */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        {/* استخدام register بدلاً من value و onChange */}
                        <input
                            type="email"
                            placeholder={t('email_placeholder')}
                            {...register('email')}
                            // تغيير لون الإطار للأحمر إذا كان هناك خطأ في التحقق
                            className={`w-full px-6 py-4 border rounded-full text-[#212121] placeholder:text-[#9E9E9E] focus:ring-2 focus:ring-[#E91E63] outline-none transition-colors ${
                                errors.email ? 'border-red-500' : 'border-[#F4A9BC]'
                            }`}
                        />
                        {/* عرض رسالة خطأ Yup الخاصة بالإيميل */}
                        {errors.email && (
                            <p className="text-red-500 text-xs mt-2 px-4">{errors.email.message}</p>
                        )}
                    </div>
                    
                    <div>
                        <input
                            type="password"
                            placeholder={t('password_placeholder')}
                            {...register('password')}
                            className={`w-full px-6 py-4 border rounded-full text-[#212121] placeholder:text-[#9E9E9E] focus:ring-2 focus:ring-[#E91E63] outline-none transition-colors ${
                                errors.password ? 'border-red-500' : 'border-[#F4A9BC]'
                            }`}
                        />
                        {/* عرض رسالة خطأ Yup الخاصة بكلمة المرور */}
                        {errors.password && (
                            <p className="text-red-500 text-xs mt-2 px-4">{errors.password.message}</p>
                        )}
                    </div>

                    <div className={`text-${i18n.language === 'ar' ? 'right' : 'left'}`}>
                        <a href="#" className="text-sm text-[#E91E63] hover:underline">{t('forgot_password')}</a>
                    </div>
                    
                    <div>
                        {/* تعطيل الزر إذا كان قيد الإرسال أو إذا تم عرض رسالة النجاح (لمنع النقر المتكرر) */}
                        <button 
                            type="submit" 
                            disabled={loginMutation.isPending || !!successMessage}
                            className="w-full py-4 bg-[#E91E63] text-white rounded-full text-lg font-medium hover:bg-[#D81B60] transition-colors disabled:opacity-70 flex justify-center items-center"
                        >
                            {loginMutation.isPending ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                t('submit_button')
                            )}
                        </button>
                    </div>
                </form>
                <p className="text-center text-xs text-[#9E9E9E] mt-12">{t('footer')}</p>
            </div>
        </div>
    );
}