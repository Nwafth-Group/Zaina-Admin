import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';

export default function ConfirmDeleteModal({ category, onClose }) {
    const { t, i18n } = useTranslation('categories');
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: () => {
            return axiosInstance.delete(`/admin/categories/${category.id}`);
        },
        onSuccess: (response) => {
            toast.success(response.data.message || "تم الحذف بنجاح");
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "لا يمكن حذف هذا القسم (قد يحتوي على بيانات فرعية).");
            onClose();
        }
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 font-main">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
                
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-2">{t('delete_modal.title')}</h3>
                <p className="text-gray-600 mb-1">
                    {t('delete_modal.warning')} <span className="font-bold text-gray-900">"{i18n.language === 'ar' ? category.name_ar : category.name_en}"</span>؟
                </p>
                <p className="text-sm text-red-500 mb-6">{t('delete_modal.sub_warning')}</p>

                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={onClose} 
                        className="px-5 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors w-1/2"
                    >
                        {t('delete_modal.cancel')}
                    </button>
                    <button 
                        onClick={() => deleteMutation.mutate()} 
                        disabled={deleteMutation.isPending}
                        className="px-5 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors w-1/2 flex items-center justify-center"
                    >
                        {deleteMutation.isPending ? '...' : t('delete_modal.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}