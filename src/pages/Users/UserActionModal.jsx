import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';

import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

export default function UserActionModal({ userId, onClose }) {
    const { t } = useTranslation('users');
    const queryClient = useQueryClient();

    // 1. جلب بيانات المستخدم المحددة (GET)
    const { data: userData, isLoading: isFetching } = useQuery({
        queryKey: ['user', userId],
        queryFn: async () => {
            const response = await axiosInstance.get(`/admin/users/${userId}`);
            return response.data.data;
        },
        enabled: !!userId,
    });

    // 2. إعداد قواعد التحقق (Yup Schema)
    // نتحقق فقط من الحقول القابلة للتعديل (Role و Status)
    const schema = yup.object().shape({
        status: yup.string().required(t('action_modal.validation_required')),
        role: yup.string().required(t('action_modal.validation_required')),
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
    });

    // 3. تعبئة الفورم بالبيانات عند وصولها من السيرفر
    useEffect(() => {
        if (userData) {
            reset({
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                email: userData.email || '',
                mobile_number: userData.mobile_number || '',
                status: userData.status || 'active',
                role: userData.primary_role || 'Customer', 
            });
        }
    }, [userData, reset]);

    // 4. إعداد عملية التحديث (PUT)
    const updateMutation = useMutation({
        mutationFn: (formData) => {
            // نرسل فقط status و roles (كمصفوفة) بناءً على الـ API Request عندك
            const payload = {
                status: formData.status,
                roles: [formData.role] 
            };
            return axiosInstance.put(`/admin/users/${userId}`, payload);
        },
        onSuccess: (response) => {
            toast.success(response.data.message || "تم تحديث بيانات المستخدم بنجاح");
            queryClient.invalidateQueries({ queryKey: ['users'] }); 
            onClose(); 
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "حدث خطأ أثناء التحديث.");
            console.error("Update error:", error.response?.data);
        }
    });

    const onSubmit = (data) => {
        updateMutation.mutate(data);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 font-main">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
                
                {/* الترويسة (Header) */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-800">
                        {t('action_modal.title')}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* محتوى الـ Modal */}
                <div className="overflow-y-auto p-6">
                    {isFetching ? (
                        <div className="flex flex-col justify-center items-center h-48 gap-4">
                            <svg className="animate-spin h-8 w-8 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                            </svg>
                            <p className="text-gray-500">{t('action_modal.fetching_data')}</p>
                        </div>
                    ) : (
                        <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            
                            {/* --- قسم البيانات الشخصية (للقراءة فقط) --- */}
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('action_modal.personal_info')}</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('action_modal.first_name')}</label>
                                        <input type="text" {...register('first_name')} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('action_modal.last_name')}</label>
                                        <input type="text" {...register('last_name')} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed outline-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('action_modal.email')}</label>
                                        <input type="email" {...register('email')} disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('action_modal.phone')}</label>
                                        <input type="text" {...register('mobile_number')} dir="ltr" disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed outline-none text-left" />
                                    </div>
                                </div>
                            </div>

                            {/* --- قسم التعديل (Role & Status) --- */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('action_modal.role')}</label>
                                    <select {...register('role')} className={`w-full px-4 py-3 border rounded-xl outline-none transition-all bg-white ${errors.role ? 'border-red-500' : 'border-gray-200 focus:border-[#F4A9BC] focus:ring-1 focus:ring-[#E91E63]'}`}>
                                        {/* تم وضع الصلاحيات بناءً على جدول قاعدة البيانات */}
                                        <option value="Super Admin">Super Admin</option>
                                        <option value="Operations Manager">Operations Manager</option>
                                        <option value="Customer">Customer</option>
                                        <option value="Driver">Driver</option>
                                    </select>
                                    {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('action_modal.status')}</label>
                                    <select {...register('status')} className={`w-full px-4 py-3 border rounded-xl outline-none transition-all bg-white ${errors.status ? 'border-red-500' : 'border-gray-200 focus:border-[#F4A9BC] focus:ring-1 focus:ring-[#E91E63]'}`}>
                                        <option value="active">{t('status.active')}</option>
                                        <option value="inactive">{t('status.inactive')}</option>
                                    </select>
                                    {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status.message}</p>}
                                </div>
                            </div>
                        </form>
                    )}
                </div>

                {/* الأزرار (Footer) */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 rtl:flex-row-reverse justify-end mt-auto">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                        {t('action_modal.cancel')}
                    </button>
                    <button type="submit" form="user-form" disabled={updateMutation.isPending || isFetching} className="px-6 py-2.5 rounded-xl font-medium text-white bg-[#E91E63] hover:bg-[#D81B60] transition-colors disabled:opacity-70 min-w-[140px] flex justify-center items-center">
                        {updateMutation.isPending ? (
                            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                            </svg>
                        ) : t('action_modal.submit')}
                    </button>
                </div>

            </div>
        </div>
    );
}