import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios.js';
import toast from 'react-hot-toast';

import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

export default function ResetPasswordModal({ userId, onClose }) {
    const { t, i18n } = useTranslation('users');
    const [serverError, setServerError] = useState('');

    // 1. بناء قواعد التحقق (Yup Schema)
    const schema = yup.object().shape({
        password: yup
            .string()
            .required(t('reset_password_modal.validation_required'))
            .min(6, t('reset_password_modal.validation_min')),
        password_confirmation: yup
            .string()
            .required(t('reset_password_modal.validation_required'))
            // التأكد من أن حقل التأكيد يطابق حقل الباسوورد
            .oneOf([yup.ref('password')], t('reset_password_modal.validation_match')),
    });

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm({
        resolver: yupResolver(schema),
    });

    // 2. إعداد عملية الإرسال (Mutation)
    const resetMutation = useMutation({
        mutationFn: (data) => {
            // نرسل الطلب مع إضافة userId في الرابط كما طلبت
            return axiosInstance.post(`/admin/users/${userId}/reset-password`, data);
        },
        onSuccess: (response) => {
            // إظهار تنبيه نجاح (أو يمكنك استخدام Toast لاحقاً)
           toast.success(response.data.message || "تم تغيير كلمة المرور بنجاح");
            onClose();
        },
        onError: (error) => {
            const msg = error.response?.data?.message || 'حدث خطأ، يرجى المحاولة مرة أخرى.';
            setServerError(msg);
        }
    });

    const onSubmit = (data) => {
        setServerError('');
        resetMutation.mutate(data);
    };

    return (
        // خلفية سوداء شفافة للـ Modal
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 font-main">
            
            {/* صندوق الـ Modal */}
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
                
                {/* الترويسة (Header) */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-800">
                        {t('reset_password_modal.title')}
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* الفورم (Form) */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
                    
                    {/* رسالة الخطأ من السيرفر */}
                    {serverError && (
                        <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm text-center">
                            {serverError}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('reset_password_modal.new_password')}
                        </label>
                        <input
                            type="password"
                            {...register('password')}
                            className={`w-full px-4 py-3 border rounded-xl text-gray-800 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#E91E63] outline-none transition-all ${
                                errors.password ? 'border-red-500' : 'border-gray-200'
                            }`}
                        />
                        {errors.password && (
                            <p className="text-red-500 text-xs mt-1 px-1">{errors.password.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('reset_password_modal.confirm_password')}
                        </label>
                        <input
                            type="password"
                            {...register('password_confirmation')}
                            className={`w-full px-4 py-3 border rounded-xl text-gray-800 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#E91E63] outline-none transition-all ${
                                errors.password_confirmation ? 'border-red-500' : 'border-gray-200'
                            }`}
                        />
                        {errors.password_confirmation && (
                            <p className="text-red-500 text-xs mt-1 px-1">{errors.password_confirmation.message}</p>
                        )}
                    </div>

                    {/* الأزرار (Footer) */}
                    <div className="pt-4 flex gap-3 rtl:flex-row-reverse justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            {t('reset_password_modal.cancel')}
                        </button>
                        
                        <button
                            type="submit"
                            disabled={resetMutation.isPending}
                            className="px-6 py-2.5 rounded-xl font-medium text-white bg-[#E91E63] hover:bg-[#D81B60] transition-colors disabled:opacity-70 flex items-center justify-center min-w-[120px]"
                        >
                            {resetMutation.isPending ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                t('reset_password_modal.submit')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}