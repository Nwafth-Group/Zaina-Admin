import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import FullScreenFormModal from '../../components/form/FullScreenFormModal';
import { INPUT_CLASS, LABEL_CLASS, SelectField, FormSection } from '../../components/form/FormKit';

export default function RoleActionModal({ roleToEdit, onClose }) {
    const { t } = useTranslation('common');
    const queryClient = useQueryClient();
    const isEditMode = !!roleToEdit;
    const isProtected = roleToEdit?.name === 'Super Admin' || 
        roleToEdit?.code?.toLowerCase() === 'customer' || 
        roleToEdit?.code?.toLowerCase() === 'driver' || 
        roleToEdit?.name?.toLowerCase() === 'customer' || 
        roleToEdit?.name?.toLowerCase() === 'driver';

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
        name: yup.string().required(t('role_management.validation_name_required')).max(100, t('role_management.validation_name_max')),
        code: yup.string().required(t('role_management.validation_code_required')).max(100, t('role_management.validation_code_max')),
        description: yup.string().nullable().max(1000, t('role_management.validation_desc_max')),
        status: yup.string().required(t('role_management.validation_status_required')),
    });

    const { register, handleSubmit, reset, setError, formState: { errors } } = useForm({
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
            toast.success(response.data?.message || t('role_management.save_success'));
            queryClient.invalidateQueries({ queryKey: ['roles-list'] });
            onClose();
        },
        onError: (error) => {
            const validationErrors = error.response?.data?.errors || error.response?.data?.params;
            if (validationErrors) {
                Object.entries(validationErrors).forEach(([key, messages]) => {
                    const message = Array.isArray(messages) ? messages[0] : messages;
                    setError(key, { type: 'server', message });
                });
            }
            toast.error(error.response?.data?.message || t('role_management.save_error'));
        },
    });

    const onSubmit = (data) => {
        if (selectedPermissions.length === 0) {
            toast.error(t('role_management.min_permissions_error'));
            return;
        }
        submitMutation.mutate(data);
    };

    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    const isLoading = isPermissionsLoading || (isEditMode && isRoleLoading);

    return (
        <FullScreenFormModal
            title={isEditMode ? t('role_management.edit_role') : t('role_management.add_role')}
            onClose={onClose}
            formId="role-action-form"
            onSubmit={handleSubmit(onSubmit)}
            isLoading={isLoading}
            isSubmitting={submitMutation.isLoading}
            cancelLabel={t('role_management.cancel')}
            submitLabel={t('role_management.save_role')}
        >
            <FormSection icon="shield" title={t('role_management.basic_info')} description={t('role_management.basic_info_desc')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('role_management.role_name_label')}</label>
                        <input
                            type="text"
                            {...register('name')}
                            disabled={isProtected}
                            className={INPUT_CLASS}
                            placeholder={t('role_management.role_name_placeholder')}
                        />
                        <ErrorMsg name="name" />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>{t('role_management.role_code_label')}</label>
                        <input
                            type="text"
                            {...register('code')}
                            disabled={isProtected}
                            className={INPUT_CLASS}
                            placeholder={t('role_management.role_code_placeholder')}
                        />
                        <ErrorMsg name="code" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('role_management.description_label')}</label>
                        <textarea
                            rows="2"
                            {...register('description')}
                            disabled={isProtected}
                            className={`${INPUT_CLASS} resize-none`}
                            placeholder={t('role_management.description_placeholder')}
                        />
                        <ErrorMsg name="description" />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>{t('role_management.status_label')}</label>
                        <SelectField registration={register('status')} disabled={isProtected}>
                            <option value="active">{t('role_management.active_option')}</option>
                            <option value="inactive">{t('role_management.inactive_option')}</option>
                        </SelectField>
                        <ErrorMsg name="status" />
                    </div>
                </div>
            </FormSection>

            <FormSection icon="key" title={t('role_management.permissions_title')} description={t('role_management.permissions_desc')}>
                <div className="space-y-6">
                    {Object.entries(groupedPermissions).map(([moduleName, modulePermissions]) => {
                        const modulePermissionNames = modulePermissions.map((p) => p.name);
                        const isAllSelected = modulePermissionNames.every((name) => selectedPermissions.includes(name));

                        return (
                            <div key={moduleName} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2.5 mb-3.5">
                                    <h4 className="text-md font-bold text-gray-800 capitalize">
                                        {moduleName} ({t('role_management.module_management')})
                                    </h4>
                                    <button
                                        type="button"
                                        disabled={isProtected}
                                        onClick={() => handleSelectAllModule(moduleName, modulePermissions)}
                                        className={`text-xs text-[#E91E63] hover:text-[#D81B60] font-semibold transition-colors ${isProtected ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    >
                                        {isAllSelected ? t('role_management.deselect_all') : t('role_management.select_all')}
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
                                                } ${isProtected ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={isProtected}
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
