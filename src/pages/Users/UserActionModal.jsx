import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FullScreenFormModal from '../../components/form/FullScreenFormModal';
import { INPUT_CLASS, LABEL_CLASS, SelectField, OptionCards, FormSection } from '../../components/form/FormKit';

const DISABLED_INPUT = 'w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed outline-none';

export default function UserActionModal({ userId, onClose }) {
    const { t } = useTranslation('users');
    const queryClient = useQueryClient();

    const { data: userData, isLoading: isFetching } = useQuery({
        queryKey: ['user', userId],
        queryFn: async () => (await axiosInstance.get(`/admin/users/${userId}`)).data.data,
        enabled: !!userId,
    });

    const schema = yup.object().shape({
        status: yup.string().required(t('action_modal.validation_required')),
        role: yup.string().required(t('action_modal.validation_required')),
    });

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
    });

    const statusValue = watch('status');

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

    const updateMutation = useMutation({
        mutationFn: (formData) => axiosInstance.put(`/admin/users/${userId}`, {
            status: formData.status,
            roles: [formData.role],
        }),
        onSuccess: (response) => {
            toast.success(response.data.message || 'تم تحديث بيانات المستخدم بنجاح');
            queryClient.invalidateQueries({ queryKey: ['users'] });
            onClose();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'حدث خطأ أثناء التحديث.');
        },
    });

    const onSubmit = (data) => updateMutation.mutate(data);

    return (
        <FullScreenFormModal
            title={t('action_modal.title')}
            onClose={onClose}
            formId="user-form"
            onSubmit={handleSubmit(onSubmit)}
            isLoading={isFetching}
            isSubmitting={updateMutation.isPending}
            cancelLabel={t('action_modal.cancel')}
            submitLabel={t('action_modal.submit')}
        >
            {/* Personal info (read-only) */}
            <FormSection icon="user" title={t('action_modal.personal_info')} description={t('sections.personal.desc')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('action_modal.first_name')}</label>
                        <input {...register('first_name')} disabled className={DISABLED_INPUT} />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('action_modal.last_name')}</label>
                        <input {...register('last_name')} disabled className={DISABLED_INPUT} />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('action_modal.email')}</label>
                        <input {...register('email')} dir="ltr" disabled className={`${DISABLED_INPUT} text-left`} />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('action_modal.phone')}</label>
                        <input {...register('mobile_number')} dir="ltr" disabled className={`${DISABLED_INPUT} text-left`} />
                    </div>
                </div>
            </FormSection>

            {/* Editable: role + status */}
            <FormSection icon="shield" title={t('sections.access.title')} description={t('sections.access.desc')}>
                <div>
                    <label className={LABEL_CLASS}>{t('action_modal.role')}</label>
                    <SelectField registration={register('role')}>
                        <option value="Super Admin">Super Admin</option>
                        <option value="Operations Manager">Operations Manager</option>
                        <option value="Customer">Customer</option>
                        <option value="Driver">Driver</option>
                    </SelectField>
                    {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
                </div>
                <div>
                    <label className={LABEL_CLASS}>{t('action_modal.status')}</label>
                    <OptionCards
                        value={statusValue}
                        onChange={(v) => setValue('status', v, { shouldValidate: true })}
                        options={[
                            { value: 'active', label: t('status.active'), dot: 'bg-green-500' },
                            { value: 'inactive', label: t('status.inactive'), dot: 'bg-gray-400' },
                        ]}
                    />
                </div>
            </FormSection>
        </FullScreenFormModal>
    );
}
