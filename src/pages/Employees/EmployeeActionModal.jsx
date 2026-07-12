import React, { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FullScreenFormModal from '../../components/form/FullScreenFormModal';
import { INPUT_CLASS, LABEL_CLASS, SelectField, OptionCards, FormSection } from '../../components/form/FormKit';

export default function EmployeeActionModal({ employeeToEdit, onClose }) {
    const { t } = useTranslation('employees');
    const queryClient = useQueryClient();
    const isEditMode = !!employeeToEdit;

    const { data: rolesList } = useQuery({
        queryKey: ['rolesList'],
        queryFn: async () => {
            try {
                const res = await axiosInstance.get('/admin/roles');
                return res.data?.data?.items || res.data?.data || [];
            } catch (e) {
                return [{ name: 'Super Admin' }, { name: 'Operations Manager' }, { name: 'Customer' }];
            }
        },
    });

    const { data: fullEmployeeData, isLoading: isEmployeeLoading } = useQuery({
        queryKey: ['employeeDetails', employeeToEdit?.id],
        queryFn: async () => (await axiosInstance.get(`/admin/employees/${employeeToEdit.id}`)).data.data,
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
        password: yup.string().when('$isEditMode', (isEdit, schema) => (
            isEdit[0] ? schema.nullable() : schema.required(t('validation.required')).min(6, t('validation.min_password'))
        )),
        image: yup.mixed().nullable(),
    });

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        context: { isEditMode },
        defaultValues: { status: 'active', type: 'operation', gender: 'Male', roles: [] },
    });

    const statusValue = watch('status');

    // The Driver and Customer roles aren't assignable to internal employees.
    const visibleRoles = (rolesList || []).filter((role) => !['Driver', 'Customer'].includes(role.name));

    useEffect(() => {
        if (isEditMode && fullEmployeeData) {
            reset({
                first_name: fullEmployeeData.first_name || '',
                last_name: fullEmployeeData.last_name || '',
                phone_number: fullEmployeeData.mobile_number || '',
                email: fullEmployeeData.email || '',
                type: fullEmployeeData.type || 'operation',
                job_title: fullEmployeeData.job_title || fullEmployeeData.type || '',
                gender: fullEmployeeData.gender || 'Male',
                status: fullEmployeeData.status || 'active',
                roles: fullEmployeeData.all_roles || [],
                password: '',
            });
        }
    }, [fullEmployeeData, isEditMode, reset]);

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const formData = new FormData();
            
            // Build FormData fields
            Object.entries(data).forEach(([key, value]) => {
                if (key === 'roles') {
                    if (Array.isArray(value)) {
                        value.forEach(role => formData.append('roles[]', role));
                    }
                } else if (key === 'image') {
                    if (value && value[0]) {
                        formData.append('image', value[0]); // Upload first selected file
                    }
                } else if (value !== undefined && value !== null) {
                    if (key === 'password' && isEditMode && !value) return; // skip empty passwords
                    formData.append(key, value);
                }
            });

            if (isEditMode) {
                formData.append('_method', 'PUT');
            }

            const url = isEditMode ? `/admin/employees/${employeeToEdit.id}` : '/admin/employees';
            return axiosInstance.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || 'تم حفظ بيانات الموظف بنجاح');
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء الحفظ.');
        },
    });

    const onSubmit = (data) => submitMutation.mutate(data);
    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    return (
        <FullScreenFormModal
            title={isEditMode ? t('form.title_edit') : t('form.title_add')}
            onClose={onClose}
            formId="employee-form"
            onSubmit={handleSubmit(onSubmit)}
            isLoading={isEditMode && isEmployeeLoading}
            isSubmitting={submitMutation.isPending}
            cancelLabel={t('form.cancel')}
            submitLabel={t('form.submit')}
        >
            {/* Personal & account */}
            <FormSection icon="user" title={t('sections.account.title')} description={t('sections.account.desc')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('form.first_name')}</label>
                        <input {...register('first_name')} className={`${INPUT_CLASS} ${errors.first_name ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="first_name" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('form.last_name')}</label>
                        <input {...register('last_name')} className={`${INPUT_CLASS} ${errors.last_name ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="last_name" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('form.email')}</label>
                        <input type="email" {...register('email')} dir="ltr" className={`${INPUT_CLASS} text-left ${errors.email ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="email" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('form.phone')}</label>
                        <input {...register('phone_number')} dir="ltr" placeholder="+970..." className={`${INPUT_CLASS} text-left ${errors.phone_number ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="phone_number" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('form.password')}</label>
                        <input type="password" {...register('password')} placeholder={isEditMode ? t('form.password_hint') : '********'} className={`${INPUT_CLASS} ${errors.password ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="password" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('form.profile_image', { defaultValue: 'صورة البروفايل' })}</label>
                        <input type="file" accept="image/*" {...register('image')} className={`${INPUT_CLASS} ${errors.image ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="image" />
                    </div>
                </div>
            </FormSection>

            {/* Job */}
            <FormSection icon="briefcase" title={t('sections.job.title')} description={t('sections.job.desc')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('form.type')}</label>
                        <SelectField registration={register('type')}>
                            <option value="operation">{t('types.operation')}</option>
                            <option value="super_admin">{t('types.super_admin')}</option>
                        </SelectField>
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('form.job_title')}</label>
                        <input {...register('job_title')} className={`${INPUT_CLASS} ${errors.job_title ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="job_title" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('form.gender')}</label>
                        <SelectField registration={register('gender')}>
                            <option value="Male">{t('gender.male')}</option>
                            <option value="Female">{t('gender.female')}</option>
                        </SelectField>
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('form.status')}</label>
                        <OptionCards
                            value={statusValue}
                            onChange={(v) => setValue('status', v, { shouldValidate: true })}
                            options={[
                                { value: 'active', label: t('status.active'), dot: 'bg-green-500' },
                                { value: 'inactive', label: t('status.inactive'), dot: 'bg-gray-400' },
                            ]}
                        />
                    </div>
                </div>
            </FormSection>

            {/* Roles — one per line, translated; the Driver role is not assignable here */}
            <FormSection icon="shield" title={t('sections.roles.title')} description={t('sections.roles.desc')}>
                <div className="flex flex-col gap-2 p-3 border border-gray-100 rounded-lg bg-gray-50/50">
                    {visibleRoles.map((role) => (
                        <label key={role.name} className="flex items-center gap-2.5 w-full cursor-pointer bg-white px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-[#FDF0F3] transition-colors">
                            <input type="checkbox" value={role.name} {...register('roles')} className="w-4 h-4 text-[#E91E63] rounded focus:ring-[#E91E63]" />
                            <span className="text-sm font-medium text-gray-700">{t(`roles_map.${role.name}`, { defaultValue: role.name })}</span>
                        </label>
                    ))}
                </div>
                <ErrorMsg name="roles" />
            </FormSection>
        </FullScreenFormModal>
    );
}
