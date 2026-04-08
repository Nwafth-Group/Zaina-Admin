import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios.js';

// استدعاء النوافذ المنبثقة
import CategoryActionModal from './CategoryActionModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';

export default function Category() {
    const { t, i18n } = useTranslation('categories');
    
    // States للتحكم بالنوافذ المنبثقة
    // لاحظ: استخدمنا categoryToEdit بدل editId لتمرير الكائن كامل وتفادي الانتظار
    const [actionModal, setActionModal] = useState({ isOpen: false, categoryToEdit: null });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, category: null });

    // جلب بيانات الأقسام من الـ API
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await axiosInstance.get('/admin/categories');
            return response.data.data.items || [];
        },
    });

    // إعادة هيكلة البيانات: دمج كل قسم رئيسي مع أبنائه تحته مباشرة
    const structuredCategories = useMemo(() => {
        if (!data) return [];
        
        const parents = data.filter(item => item.parent === null);
        const result = [];

        parents.forEach(parent => {
            result.push({ ...parent, isMain: true });
            const children = data.filter(item => item.parent?.id === parent.id);
            children.forEach(child => {
                result.push({ ...child, isMain: false });
            });
        });

        return result;
    }, [data]);

    // استخراج الأقسام الرئيسية فقط لكي نرسلها لنموذج الإضافة كقائمة منسدلة (Dropdown)
    const mainCategories = useMemo(() => data ? data.filter(item => item.parent === null) : [], [data]);

    if (isError) {
        return <div className="p-8 text-red-500 font-bold">حدث خطأ: {error.message}</div>;
    }

    const currentLang = i18n.language;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
            
            {/* الترويسة العلوية للصفحة */}
            <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">{t('title')}</h2>
                
                {/* 1. زر إضافة قسم جديد */}
                <button 
                    // عند الإضافة نمرر null عشان يفتح فورم فاضي
                    onClick={() => setActionModal({ isOpen: true, categoryToEdit: null })}
                    className="bg-[#E91E63] text-white px-6 py-2.5 rounded-full font-medium hover:bg-[#D81B60] transition-colors shadow-sm flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {t('add_new')}
                </button>
            </div>

            {/* الجدول */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 w-16">{t('table.image')}</th>
                            <th className="px-6 py-4">{t('table.name')}</th>
                            <th className="px-6 py-4">{t('table.type')}</th>
                            <th className="px-6 py-4 text-center">{t('table.status')}</th>
                            <th className="px-6 py-4 text-center">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-3">
                                        <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                                        </svg>
                                        <span className="text-lg font-medium">{t('loading')}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : structuredCategories.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">{t('no_data')}</td>
                            </tr>
                        ) : (
                            structuredCategories.map((category) => (
                                <tr 
                                    key={category.id} 
                                    className={`border-b transition-colors hover:bg-gray-50 ${
                                        category.isMain ? 'bg-gray-50/30' : 'bg-white'
                                    }`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                                            {category.image ? (
                                                <img src={category.image} alt={category.name_en} className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={`flex items-center gap-2 ${category.isMain ? 'font-bold text-gray-800' : 'rtl:pr-6 ltr:pl-6 text-gray-600'}`}>
                                            {!category.isMain && (
                                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            )}
                                            {currentLang === 'ar' ? category.name_ar : category.name_en}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                                            category.isMain ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {category.isMain ? t('types.main') : t('types.sub')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            category.status === 'active' 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {category.status === 'active' ? t('status.active') : t('status.inactive')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center items-center gap-3">
                                            
                                            {/* 2. زر التعديل (يمرر الكائن category كاملاً للـ Modal) */}
                                            <button 
                                                onClick={() => setActionModal({ isOpen: true, categoryToEdit: category })}
                                                className="text-blue-500 hover:text-blue-700 transition-colors" 
                                                title="Edit"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            
                                            {/* 3. زر الحذف */}
                                            <button 
                                                onClick={() => setDeleteModal({ isOpen: true, category: category })}
                                                className="text-red-500 hover:text-red-700 transition-colors" 
                                                title="Delete"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>

                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* تشغيل النوافذ المنبثقة بناءً على الـ State */}
            {actionModal.isOpen && (
                <CategoryActionModal 
                    categoryToEdit={actionModal.categoryToEdit} // استلام الكائن
                    mainCategories={mainCategories} 
                    onClose={() => setActionModal({ isOpen: false, categoryToEdit: null })} 
                />
            )}

            {deleteModal.isOpen && (
                <ConfirmDeleteModal 
                    category={deleteModal.category} 
                    onClose={() => setDeleteModal({ isOpen: false, category: null })} 
                />
            )}

        </div>
    );
}