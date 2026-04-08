import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

export default function CategoryActionModal({ categoryToEdit, mainCategories, onClose }) {
    const { t, i18n } = useTranslation('categories');
    const queryClient = useQueryClient();
    
    // إذا كان categoryToEdit موجود، يعني إحنا في وضع التعديل
    const isEditMode = !!categoryToEdit;

    const schema = yup.object().shape({
        name_ar: yup.string().required(t('action_modal.validation_required')),
        name_en: yup.string().required(t('action_modal.validation_required')),
        status: yup.string().required(t('action_modal.validation_required')),
        parent_id: yup.string().nullable(),
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { status: 'active', parent_id: '' }
    });

    // تعبئة الفورم فوراً بدون أي تأخير من السيرفر
    useEffect(() => {
        if (categoryToEdit && isEditMode) {
            reset({
                name_ar: categoryToEdit.name_ar || '',
                name_en: categoryToEdit.name_en || '',
                status: categoryToEdit.status || 'active',
                parent_id: categoryToEdit.parent?.id || '', // أخذ الـ ID تبع الأب إذا كان موجود
            });
        }
    }, [categoryToEdit, isEditMode, reset]);

    const submitMutation = useMutation({
        mutationFn: async (formData) => {
            const payload = new FormData();
            payload.append('name_ar', formData.name_ar);
            payload.append('name_en', formData.name_en);
            payload.append('status', formData.status);
            
            if (formData.parent_id) {
                payload.append('parent_id', formData.parent_id);
            }

            const imageFile = formData.image && formData.image.length > 0 ? formData.image[0] : null;
            if (imageFile) {
                payload.append('image', imageFile);
            }

            if (isEditMode) {
                payload.append('_method', 'PUT');
                return axiosInstance.post(`/admin/categories/${categoryToEdit.id}`, payload, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                return axiosInstance.post('/admin/categories', payload, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
        },
        onSuccess: (response) => {
            toast.success(response.data.message || "تمت العملية بنجاح");
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "حدث خطأ أثناء حفظ البيانات.");
        }
    });

    const onSubmit = (data) => submitMutation.mutate(data);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 font-main">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
                
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-800">
                        {isEditMode ? t('action_modal.title_edit') : t('action_modal.title_add')}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="overflow-y-auto p-6">
                    <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('action_modal.name_ar')}</label>
                                <input type="text" {...register('name_ar')} className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${errors.name_ar ? 'border-red-500' : 'focus:border-[#F4A9BC] focus:ring-1 focus:ring-[#E91E63]'}`} />
                                {errors.name_ar && <p className="text-red-500 text-xs mt-1">{errors.name_ar.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('action_modal.name_en')}</label>
                                <input type="text" {...register('name_en')} className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${errors.name_en ? 'border-red-500' : 'focus:border-[#F4A9BC] focus:ring-1 focus:ring-[#E91E63]'}`} />
                                {errors.name_en && <p className="text-red-500 text-xs mt-1">{errors.name_en.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('action_modal.parent_category')}</label>
                                <select {...register('parent_id')} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#F4A9BC] focus:ring-1 focus:ring-[#E91E63] bg-white">
                                    <option value="">-- {t('action_modal.none')} --</option>
                                    {mainCategories.map(cat => (
                                        cat.id !== categoryToEdit?.id && (
                                            <option key={cat.id} value={cat.id}>
                                                {i18n.language === 'ar' ? cat.name_ar : cat.name_en}
                                            </option>
                                        )
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('action_modal.status')}</label>
                                <select {...register('status')} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#F4A9BC] focus:ring-1 focus:ring-[#E91E63] bg-white">
                                    <option value="active">{t('status.active', { ns: 'categories' })}</option>
                                    <option value="inactive">{t('status.inactive', { ns: 'categories' })}</option>
                                </select>
                            </div>
                        </div>

                        {/* قسم رفع وعرض الصورة */}
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <label className="block text-sm font-medium text-gray-700 mb-3">{t('action_modal.image')}</label>
                            
                            {/* عرض الصورة القديمة إن وجدت */}
                            {isEditMode && categoryToEdit?.image && (
                                <div className="mb-4 flex items-center gap-4">
                                    <img 
                                        src={categoryToEdit.image} 
                                        alt="Current Category" 
                                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm"
                                    />
                                    <span className="text-xs text-gray-500">الصورة الحالية للقسم</span>
                                </div>
                            )}

                            <input type="file" accept="image/*" {...register('image')} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#FDF0F3] file:text-[#E91E63] hover:file:bg-[#fce4ec]" />
                            <p className="text-xs text-gray-400 mt-3">{t('action_modal.image_hint')}</p>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 rtl:flex-row-reverse justify-end mt-auto">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors">{t('action_modal.cancel')}</button>
                    <button type="submit" form="category-form" disabled={submitMutation.isPending} className="px-6 py-2.5 rounded-xl font-medium text-white bg-[#E91E63] hover:bg-[#D81B60] transition-colors disabled:opacity-70 min-w-[140px] flex justify-center items-center">
                        {submitMutation.isPending ? '...' : t('action_modal.submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}