import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FullScreenFormModal from '../../components/form/FullScreenFormModal';
import { INPUT_CLASS, LABEL_CLASS, SelectField, FormSection } from '../../components/form/FormKit';

export default function RoleActionModal({ roleToEdit, onClose }) {
    const queryClient = useQueryClient();
    const isEditMode = !!roleToEdit;

    // 1. Fetch grouped permissions list
    const { data: groupedPermissions = {}, isLoading: isPermissionsLoading } = useQuery({
        queryKey: ['system-permissions'],
        queryFn: async () => (await axiosInstance.get('/admin/roles/permissions')).data.data,
    });

    // 2. Fetch full role details (including its assigned permissions list) in edit mode
    const { data: fullRoleData, isLoading: isRoleLoading } = useQuery({
        queryKey: ['roleDetails', roleToEdit?.id],
        queryFn: async () => (await axiosInstance.get(`/admin/roles/${roleToEdit.id}`)).data.data,
        enabled: isEditMode,
    });

    const [selectedPermissions, setSelectedPermissions] = useState([]);

    const schema = yup.object().shape({
        name: yup.string().required('اسم الدور مطلوب').max(100, 'الحد الأقصى 100 حرف'),
        code: yup.string().required('كود الدور مطلوب').max(100, 'الحد الأقصى 100 حرف'),
        description: yup.string().nullable().max(1000, 'الحد الأقصى 1000 حرف'),
        status: yup.string().required('حالة الدور مطلوبة'),
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { status: 'active', name: '', code: '', description: '' },
    });

    // Sync form values and selected permissions when role details load
    useEffect(() => {
        if (isEditMode && fullRoleData) {
            reset({
                name: fullRoleData.name || '',
                code: fullRoleData.code || '',
                description: fullRoleData.description || '',
                status: fullRoleData.status || 'active',
            });
            setSelectedPermissions(fullRoleData.permissions || []);
        }
    }, [fullRoleData, isEditMode, reset]);

    const handleCheckboxChange = (permissionName) => {
        setSelectedPermissions((prev) =>
            prev.includes(permissionName)
                ? prev.filter((p) => p !== permissionName)
                : [...prev, permissionName]
        );
    };

    const handleSelectAllModule = (moduleName, modulePermissions) => {
        const modulePermissionNames = modulePermissions.map((p) => p.name);
        const allSelected = modulePermissionNames.every((name) => selectedPermissions.includes(name));

        if (allSelected) {
            // Unselect all of this module
            setSelectedPermissions((prev) => prev.filter((name) => !modulePermissionNames.includes(name)));
        } else {
            // Select all of this module (ensure no duplicates)
            setSelectedPermissions((prev) => Array.from(new Set([...prev, ...modulePermissionNames])));
        }
    };

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const payload = {
                ...data,
                permissions: selectedPermissions,
            };
            const url = isEditMode ? `/admin/roles/${roleToEdit.id}` : '/admin/roles';
            const method = isEditMode ? 'put' : 'post';
            return axiosInstance[method](url, payload);
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || 'تم حفظ الدور بنجاح');
            queryClient.invalidateQueries({ queryKey: ['roles-list'] });
            onClose();
        },
        onError: (error) => {
            const validationErrors = error.response?.data?.params;
            if (validationErrors) {
                // Show first error message from response params
                const firstKey = Object.keys(validationErrors)[0];
                toast.error(validationErrors[firstKey]);
            } else {
                toast.error(error.response?.data?.message || 'حدث خطأ أثناء حفظ البيانات.');
            }
        },
    });

    const onSubmit = (data) => {
        if (selectedPermissions.length === 0) {
            toast.error('الرجاء اختيار صلاحية واحدة على الأقل لهذا الدور.');
            return;
        }
        submitMutation.mutate(data);
    };

    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    const isLoading = isPermissionsLoading || (isEditMode && isRoleLoading);

    return (
        <FullScreenFormModal
            title={isEditMode ? 'تعديل الدور والصلاحيات' : 'إضافة دور جديد'}
            onClose={onClose}
            formId="role-action-form"
            onSubmit={handleSubmit(onSubmit)}
            isLoading={isLoading}
            isSubmitting={submitMutation.isLoading}
            cancelLabel="إلغاء"
            submitLabel="حفظ الدور"
        >
            <FormSection icon="shield" title="بيانات الدور الأساسية" description="أدخل اسم الدور ووصفه العام">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>اسم الدور (Role Name)</label>
                        <input
                            type="text"
                            {...register('name')}
                            disabled={roleToEdit?.name === 'Super Admin'}
                            className={INPUT_CLASS}
                            placeholder="مثال: مدير المبيعات"
                        />
                        <ErrorMsg name="name" />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>الكود التعريفي (Role Code)</label>
                        <input
                            type="text"
                            {...register('code')}
                            disabled={roleToEdit?.name === 'Super Admin'}
                            className={INPUT_CLASS}
                            placeholder="مثال: SALES_MANAGER"
                        />
                        <ErrorMsg name="code" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className={LABEL_CLASS}>الوصف</label>
                        <textarea
                            rows="2"
                            {...register('description')}
                            className={`${INPUT_CLASS} resize-none`}
                            placeholder="اكتب وصفاً موجزاً لمهام هذا الدور..."
                        />
                        <ErrorMsg name="description" />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>حالة الدور</label>
                        <SelectField registration={register('status')} disabled={roleToEdit?.name === 'Super Admin'}>
                            <option value="active">نشط (Active)</option>
                            <option value="inactive">غير نشط (Inactive)</option>
                        </SelectField>
                        <ErrorMsg name="status" />
                    </div>
                </div>
            </FormSection>

            <FormSection icon="key" title="صلاحيات الدور (Permissions Grid)" description="حدد الصلاحيات المتاحة لهذا الدور حسب كل موديول">
                <div className="space-y-6">
                    {Object.entries(groupedPermissions).map(([moduleName, modulePermissions]) => {
                        const modulePermissionNames = modulePermissions.map((p) => p.name);
                        const isAllSelected = modulePermissionNames.every((name) => selectedPermissions.includes(name));

                        return (
                            <div key={moduleName} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2.5 mb-3.5">
                                    <h4 className="text-md font-bold text-gray-800 capitalize">
                                        {moduleName} (إدارة موديول)
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectAllModule(moduleName, modulePermissions)}
                                        className="text-xs text-[#E91E63] hover:text-[#D81B60] font-semibold transition-colors"
                                    >
                                        {isAllSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                                    {modulePermissions.map((permission) => {
                                        const checked = selectedPermissions.includes(permission.name);
                                        return (
                                            <label
                                                key={permission.id}
                                                className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                                                    checked
                                                        ? 'bg-white border-[#E91E63] shadow-sm text-gray-800'
                                                        : 'bg-white/80 border-gray-200 text-gray-500 hover:bg-white'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => handleCheckboxChange(permission.name)}
                                                    className="w-4 h-4 text-[#E91E63] border-gray-300 rounded focus:ring-[#E91E63]"
                                                />
                                                <span className="text-xs font-semibold capitalize">
                                                    {permission.action}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </FormSection>
        </FullScreenFormModal>
    );
}
