import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

export default function DriverFormPage() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { i18n } = useTranslation('common');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [form, setForm] = useState({
        name: '',
        mobile: '',
        email: '',
        gender: 'male',
        status: 'active',
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const { data: driverData, isLoading: isLoadingDriver } = useQuery({
        queryKey: ['driver-details', id],
        queryFn: async () => (await axiosInstance.get(`/admin/drivers/${id}`)).data,
        enabled: isEdit,
    });

    useEffect(() => {
        if (isEdit && driverData?.data) {
            const d = driverData.data;
            setForm({
                name: d.name || '',
                mobile: d.mobile || '',
                email: d.email || '',
                gender: d.gender || 'male',
                status: d.status || 'active',
            });
            if (d.image) setImagePreview(d.image);
        }
    }, [isEdit, driverData]);

    const mutation = useMutation({
        mutationFn: async (formData) => {
            if (isEdit) {
                formData.append('_method', 'PUT');
                return (await axiosInstance.post(`/admin/drivers/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
            }
            return (await axiosInstance.post('/admin/drivers', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
        },
        onSuccess: (res) => {
            toast.success(res?.message || (isArabic ? 'تم الحفظ بنجاح' : 'Saved successfully'));
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
            navigate('/drivers');
        },
        onError: (err) => {
            const msg = err.response?.data?.message || (isArabic ? 'حدث خطأ أثناء الحفظ' : 'Error saving driver');
            toast.error(msg);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = new FormData();
        data.append('name', form.name);
        data.append('mobile', form.mobile);
        if (form.email) data.append('email', form.email);
        data.append('gender', form.gender);
        data.append('status', form.status);
        if (imageFile) data.append('image', imageFile);

        mutation.mutate(data);
    };

    if (isEdit && isLoadingDriver) {
        return <div className="p-8 font-bold text-center text-gray-500">{isArabic ? 'جاري التحميل...' : 'Loading...'}</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 font-main py-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-gray-900">
                        {isEdit ? (isArabic ? 'تعديل بيانات السائق' : 'Edit Driver') : (isArabic ? 'إضافة سائق جديد' : 'Add New Driver')}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'أدخل البيانات الأساسية للسائق والتواصل.' : 'Fill driver personal and contact details.'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/drivers')}
                    className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition"
                >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">{isArabic ? 'اسم السائق *' : 'Driver Name *'}</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                            placeholder={isArabic ? 'مثال: أحمد محمود' : 'e.g. Ahmad Mahmoud'}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">{isArabic ? 'رقم الجوال *' : 'Mobile Number *'}</label>
                        <input
                            type="text"
                            required
                            value={form.mobile}
                            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                            placeholder="+962 7 9000 0000"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">{isArabic ? 'البريد الإلكتروني' : 'Email Address'}</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                            placeholder="driver@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">{isArabic ? 'الجنس *' : 'Gender *'}</label>
                        <select
                            value={form.gender}
                            onChange={(e) => setForm({ ...form, gender: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none bg-white"
                        >
                            <option value="male">{isArabic ? 'ذكر' : 'Male'}</option>
                            <option value="female">{isArabic ? 'أنثى' : 'Female'}</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">{isArabic ? 'حالة السائق *' : 'Status *'}</label>
                        <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none bg-white"
                        >
                            <option value="active">{isArabic ? 'نشط (متاح للعمل)' : 'Active'}</option>
                            <option value="inactive">{isArabic ? 'معطل' : 'Inactive'}</option>
                        </select>
                    </div>
                </div>

                {/* Photo Upload */}
                <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">{isArabic ? 'صورة السائق' : 'Driver Image'}</label>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center font-bold text-gray-400">
                            {imagePreview ? (
                                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span>🚘</span>
                            )}
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    setImageFile(file);
                                    setImagePreview(URL.createObjectURL(file));
                                }
                            }}
                            className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#FDF0F3] file:text-[#E91E63] hover:file:bg-[#fbdbe3] cursor-pointer"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={() => navigate('/drivers')}
                        className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                    >
                        {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                        type="submit"
                        disabled={mutation.isLoading}
                        className="px-6 py-2.5 bg-[#E91E63] text-white rounded-xl text-xs font-bold hover:bg-[#D81B60] transition shadow-md disabled:opacity-50"
                    >
                        {mutation.isLoading ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ السائق' : 'Save Driver')}
                    </button>
                </div>
            </form>
        </div>
    );
}
