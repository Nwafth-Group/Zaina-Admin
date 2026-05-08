import React, { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

export default function EmployeeActionModal({ employeeToEdit, onClose }) {
    const { t } = useTranslation('employees');
    const queryClient = useQueryClient();
    const isEditMode = !!employeeToEdit;

    // جلب الصلاحيات المتاحة (إذا كان لديك API لها، وإلا سنستخدم قائمة ثابتة بناءً على الداتا عندك)
    // هنا افترضنا وجود API لجلب الصلاحيات، إذا لم يكن موجوداً، القائمة الثابتة بالأسفل ستعمل.
    const { data: rolesList } = useQuery({
        queryKey: ['rolesList'],
        queryFn: async () => {
            try {
                const res = await axiosInstance.get('/admin/roles');
                // التعديل هنا: حاولنا نجيب items، وإذا ما لقاها بجيب data، وإذا ولا اشي برجع مصفوفة فاضية
                return res.data?.data?.items || res.data?.data || [];
            } catch (e) {
                return [
                    { name: 'Super Admin' },
                    { name: 'Operations Manager' },
                    { name: 'Customer' },
                    { name: 'Driver' }
                ];
            }
        },
    });

    const { data: fullEmployeeData, isLoading: isEmployeeLoading } = useQuery({
        queryKey: ['employeeDetails', employeeToEdit?.id],
        queryFn: async () => {
            const response = await axiosInstance.get(`/admin/employees/${employeeToEdit.id}`);
            return response.data.data;
        },
        enabled: isEditMode,
    });

    const schema = yup.object().shape({
        first_name: yup.string().required(t('validation.required')),
        last_name: yup.string().required(t('validation.required')),
        phone_number: yup.string().required(t('validation.required')),
        email: yup.string().email(t('validation.email')).required(t('validation.required')),
        type: yup.string().required(t('validation.required')),
        job_title: yup.string().required(t('validation.required')),
        gender: yup.string().required(t('validation.required')),
        status: yup.string().required(t('validation.required')),
        roles: yup.array().of(yup.string()).min(1, t('validation.required')),
        // الباسوورد مطلوب فقط في حالة الإنشاء الجديد
        password: yup.string().when('$isEditMode', (isEdit, schema) => {
            return isEdit[0] ? schema.nullable() : schema.required(t('validation.required')).min(6, t('validation.min_password'));
        }),
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        context: { isEditMode },
        defaultValues: { status: 'active', type: 'operation', gender: 'Male', roles: [] }
    });

    useEffect(() => {
        if (isEditMode && fullEmployeeData) {
            reset({
                first_name: fullEmployeeData.first_name || '',
                last_name: fullEmployeeData.last_name || '',
                // لاحظ: الـ GET يرجع mobile_number ولكن الـ PUT/POST يتطلب phone_number
                phone_number: fullEmployeeData.mobile_number || '', 
                email: fullEmployeeData.email || '',
                type: fullEmployeeData.type || 'operation',
                job_title: fullEmployeeData.job_title || fullEmployeeData.type || '',
                gender: fullEmployeeData.gender || 'Male',
                status: fullEmployeeData.status || 'active',
                roles: fullEmployeeData.all_roles || [],
                password: '' // نتركه فارغاً لكي لا نعدله إلا إذا كتب فيه الأدمن
            });
        }
    }, [fullEmployeeData, isEditMode, reset]);

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            // تنظيف البيانات (إزالة الباسوورد إذا كان فارغاً في وضع التعديل)
            const payload = { ...data };
            if (isEditMode && !payload.password) {
                delete payload.password;
            }

            // إرسال كـ JSON عادي بناءً على البوستمان
            const url = isEditMode ? `/admin/employees/${employeeToEdit.id}` : '/admin/employees';
            const method = isEditMode ? 'put' : 'post';
            
            return axiosInstance[method](url, payload);
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || "تم حفظ بيانات الموظف بنجاح");
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "حدث خطأ أثناء الحفظ.");
        }
    });

    const onSubmit = (data) => submitMutation.mutate(data);
    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 font-main">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden relative max-h-[90vh] flex flex-col">
                
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-800">{isEditMode ? t('form.title_edit') : t('form.title_add')}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="overflow-y-auto p-6 bg-[#F8F9FA]">
                    {isEditMode && isEmployeeLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <svg className="animate-spin h-8 w-8 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                        </div>
                    ) : (
                        <form id="employee-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            
                            {/* البيانات الشخصية والحساب */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium mb-1">{t('form.first_name')}</label><input {...register('first_name')} className={`w-full px-4 py-2.5 border rounded-lg outline-none ${errors.first_name ? 'border-red-500' : 'border-gray-200 focus:border-[#E91E63]'}`} /><ErrorMsg name="first_name" /></div>
                                    <div><label className="block text-sm font-medium mb-1">{t('form.last_name')}</label><input {...register('last_name')} className={`w-full px-4 py-2.5 border rounded-lg outline-none ${errors.last_name ? 'border-red-500' : 'border-gray-200 focus:border-[#E91E63]'}`} /><ErrorMsg name="last_name" /></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium mb-1">{t('form.email')}</label><input type="email" {...register('email')} className={`w-full px-4 py-2.5 border rounded-lg outline-none text-left ${errors.email ? 'border-red-500' : 'border-gray-200 focus:border-[#E91E63]'}`} dir="ltr" /><ErrorMsg name="email" /></div>
                                    <div><label className="block text-sm font-medium mb-1">{t('form.phone')}</label><input {...register('phone_number')} className={`w-full px-4 py-2.5 border rounded-lg outline-none text-left ${errors.phone_number ? 'border-red-500' : 'border-gray-200 focus:border-[#E91E63]'}`} dir="ltr" placeholder="+970..." /><ErrorMsg name="phone_number" /></div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('form.password')}</label>
                                    <input type="password" {...register('password')} className={`w-full px-4 py-2.5 border rounded-lg outline-none ${errors.password ? 'border-red-500' : 'border-gray-200 focus:border-[#E91E63]'}`} placeholder={isEditMode ? t('form.password_hint') : '********'} />
                                    <ErrorMsg name="password" />
                                </div>
                            </div>

                            {/* البيانات الوظيفية */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium mb-1">{t('form.type')}</label><input {...register('type')} className={`w-full px-4 py-2.5 border rounded-lg outline-none ${errors.type ? 'border-red-500' : 'border-gray-200 focus:border-[#E91E63]'}`} /></div>
                                    <div><label className="block text-sm font-medium mb-1">{t('form.job_title')}</label><input {...register('job_title')} className={`w-full px-4 py-2.5 border rounded-lg outline-none ${errors.job_title ? 'border-red-500' : 'border-gray-200 focus:border-[#E91E63]'}`} /></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('form.gender')}</label>
                                        <select {...register('gender')} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none bg-white">
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('form.status')}</label>
                                        <select {...register('status')} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none bg-white">
                                            <option value="active">{t('status.active', { ns: 'employees' })}</option>
                                            <option value="inactive">{t('status.inactive', { ns: 'employees' })}</option>
                                        </select>
                                    </div>
                                </div>
                                
                                {/* الصلاحيات (Roles) */}
                                <div className="border-t pt-4">
                                    <label className="block text-sm font-bold mb-3 text-gray-700">{t('form.roles')}</label>
                                    <div className="flex flex-wrap gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50/50">
                                        {rolesList?.map(role => (
                                            <label key={role.name} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 border border-gray-200 rounded hover:bg-[#FDF0F3] transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    value={role.name} 
                                                    {...register('roles')} 
                                                    className="w-4 h-4 text-[#E91E63] rounded focus:ring-[#E91E63]"
                                                />
                                                <span className="text-sm font-medium text-gray-700">{role.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <ErrorMsg name="roles" />
                                </div>
                            </div>

                        </form>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-white flex gap-3 rtl:flex-row-reverse justify-end mt-auto">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">{t('form.cancel')}</button>
                    <button type="submit" form="employee-form" disabled={submitMutation.isPending || (isEditMode && isEmployeeLoading)} className="px-6 py-2.5 rounded-xl font-medium text-white bg-[#E91E63] hover:bg-[#D81B60] transition-colors disabled:opacity-70 min-w-[120px] flex justify-center items-center">
                        {submitMutation.isPending ? '...' : t('form.submit')}
                    </button>
                </div>
            </div>
        </div>
    );
}