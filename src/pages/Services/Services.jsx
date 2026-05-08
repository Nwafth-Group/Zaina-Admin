import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

// استدعاء نافذة الإضافة والتعديل
import ServiceActionModal from './ServiceActionModal';

export default function Services() {
    const { t, i18n } = useTranslation('services');
    const queryClient = useQueryClient();
    const currentLang = i18n.language;

    // حالة للتحكم بفتح وإغلاق نافذة الإضافة/التعديل
    const [actionModal, setActionModal] = useState({ isOpen: false, serviceToEdit: null });

    // 1. جلب قائمة الخدمات
    const { data: services, isLoading, isError, error } = useQuery({
        queryKey: ['services'],
        queryFn: async () => {
            const response = await axiosInstance.get('/admin/services');
            return response.data.data.items || [];
        },
    });

    // 2. جلب قائمة الأقسام (Categories) لتمريرها كقائمة منسدلة داخل الـ Modal
    const { data: categories } = useQuery({
        queryKey: ['categoriesList'],
        queryFn: async () => {
            const response = await axiosInstance.get('/admin/categories');
            // نجلب فقط الأقسام الفرعية أو نرسلها كلها حسب احتياجك (هنا نرسل الكل)
            return response.data.data.items || [];
        },
    });

    // 3. عملية تغيير حالة الخدمة (Toggle Status)
    const toggleStatusMutation = useMutation({
        mutationFn: (serviceId) => {
            return axiosInstance.post(`/admin/services/${serviceId}/toggle-status`);
        },
        onSuccess: (response) => {
            toast.success(response.data.message || "تم تغيير حالة الخدمة بنجاح");
            queryClient.invalidateQueries({ queryKey: ['services'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "حدث خطأ أثناء تغيير الحالة.");
            console.error("Toggle status error:", error);
        }
    });

    // دالة مساعدة لاختيار لون شارة (Badge) نوع الخدمة
    const getTypeBadgeStyles = (type) => {
        switch (type) {
            case 'hourly': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'moqema': return 'bg-purple-50 text-purple-600 border-purple-200';
            case 'both': return 'bg-teal-50 text-teal-600 border-teal-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    if (isError) return <div className="p-8 text-red-500 font-bold">حدث خطأ: {error.message}</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
            
            {/* الترويسة وزر الإضافة */}
            <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('title')}</h2>
                <button 
                    onClick={() => setActionModal({ isOpen: true, serviceToEdit: null })} // فتح نافذة الإضافة
                    className="w-full sm:w-auto bg-[#E91E63] text-white px-6 py-2.5 rounded-full font-medium hover:bg-[#D81B60] transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {t('add_new')}
                </button>
            </div>

            {/* حاوية الجدول (Responsive Horizontal Scroll) */}
            <div className="overflow-x-auto w-full">
                <table className="w-full text-sm text-left rtl:text-right text-gray-500 min-w-[800px]">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-4 w-16 text-center">{t('table.image')}</th>
                            <th className="px-4 py-4">{t('table.name')}</th>
                            <th className="px-4 py-4">{t('table.category')}</th>
                            <th className="px-4 py-4 text-center">{t('table.type')}</th>
                            <th className="px-4 py-4 text-center">{t('table.rating')}</th>
                            <th className="px-4 py-4 text-center">{t('table.status')}</th>
                            <th className="px-4 py-4 text-center">{t('table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-3">
                                        <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                                        </svg>
                                        <span className="text-lg font-medium">{t('loading')}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : services.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-10 text-center text-gray-500">{t('no_data')}</td>
                            </tr>
                        ) : (
                            services.map((service) => (
                                <tr key={service.id} className="border-b transition-colors hover:bg-gray-50 bg-white">
                                    
                                    {/* 1. الصورة */}
                                    <td className="px-4 py-3">
                                        <div className="w-12 h-12 mx-auto rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                                            {service.image ? (
                                                <img src={service.image} alt={service.name_en} className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </div>
                                    </td>

                                    {/* 2. اسم الخدمة */}
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-gray-800 line-clamp-1">
                                            {currentLang === 'ar' ? service.name_ar : service.name_en}
                                        </p>
                                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                                            {currentLang === 'ar' ? service.description_ar : service.description_en}
                                        </p>
                                    </td>

                                    {/* 3. اسم القسم التابعة له */}
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md whitespace-nowrap">
                                            {currentLang === 'ar' ? service.category?.name_ar : service.category?.name_en}
                                        </span>
                                    </td>

                                    {/* 4. نوع الخدمة */}
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getTypeBadgeStyles(service.type)}`}>
                                            {t(`types.${service.type}`)}
                                        </span>
                                    </td>

                                    {/* 5. التقييم */}
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1 text-yellow-500 font-bold">
                                            <span>{service.avg_rating}</span>
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        </div>
                                    </td>

                                    {/* 6. الحالة */}
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                            service.status === 'active' 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {service.status === 'active' ? t('status.active') : t('status.inactive')}
                                        </span>
                                    </td>

                                    {/* 7. الإجراءات */}
                                    <td className="px-4 py-3">
                                        <div className="flex justify-center items-center gap-2 md:gap-3">
                                            
                                            {/* زر التعديل (يمرر كائن الخدمة بالكامل للنافذة) */}
                                            <button 
                                                onClick={() => setActionModal({ isOpen: true, serviceToEdit: service })}
                                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" 
                                                title={t('actions.edit')}
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>

                                            {/* زر تغيير الحالة */}
                                            <button 
                                                onClick={() => toggleStatusMutation.mutate(service.id)}
                                                disabled={toggleStatusMutation.isPending}
                                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                                                    service.status === 'active' 
                                                    ? 'text-orange-500 hover:bg-orange-50' 
                                                    : 'text-green-500 hover:bg-green-50'
                                                }`} 
                                                title={t('actions.toggle_status')}
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                </svg>
                                            </button>

                                            {/* زر الحذف */}
                                            <button className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title={t('actions.delete')}>
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

            {/* نافذة الإضافة والتعديل */}
            {actionModal.isOpen && (
                <ServiceActionModal 
                    serviceToEdit={actionModal.serviceToEdit} 
                    categories={categories || []} 
                    onClose={() => setActionModal({ isOpen: false, serviceToEdit: null })} 
                />
            )}

        </div>
    );
}