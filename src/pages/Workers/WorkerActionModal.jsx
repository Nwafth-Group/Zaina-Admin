import React, { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FullScreenFormModal from '../../components/form/FullScreenFormModal';
import { INPUT_CLASS, LABEL_CLASS, OptionCards, ImageDropzone, FormSection, SelectField } from '../../components/form/FormKit';

export default function WorkerActionModal({ workerToEdit, onClose }) {
    const { t, i18n } = useTranslation('workers');
    const queryClient = useQueryClient();
    const isEditMode = !!workerToEdit;
    const isArabic = i18n.language?.startsWith('ar');

    // Fetch services list
    const { data: servicesList, isLoading: isServicesLoading } = useQuery({
        queryKey: ['servicesList'],
        queryFn: async () => (await axiosInstance.get('/admin/services')).data.data.items || [],
    });

    // Fetch full worker details for editing
    const { data: fullWorkerData, isLoading: isWorkerLoading } = useQuery({
        queryKey: ['workerDetails', workerToEdit?.id],
        queryFn: async () => (await axiosInstance.get(`/admin/workers/${workerToEdit.id}`)).data.data,
        enabled: isEditMode,
    });

    const schema = yup.object().shape({
        name: yup.string().required(t('validation.required')),
        phone_number: yup.string().required(t('validation.required')),
        nationality: yup.string().required(t('validation.required')),
        id_number: yup.string().required(t('validation.required')),
        address: yup.string().required(t('validation.required')),
        gender: yup.string().oneOf(['male', 'female']).required(t('validation.required')),
        status: yup.string().oneOf(['active', 'inactive', 'suspended']).required(t('validation.required')),
        service_id: yup.string().nullable().notRequired(),
    });

    const { register, handleSubmit, reset, watch, setValue, setError, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: { 
            status: 'active', 
            gender: 'male',
            name: '',
            phone_number: '',
            nationality: '',
            id_number: '',
            address: '',
            service_id: ''
        },
    });

    const statusValue = watch('status');
    const image = watch('image');

    useEffect(() => {
        if (isEditMode && fullWorkerData) {
            reset({
                name: fullWorkerData.name || '',
                phone_number: fullWorkerData.phone_number || '',
                nationality: fullWorkerData.nationality || '',
                id_number: fullWorkerData.id_number || '',
                address: fullWorkerData.address || '',
                gender: fullWorkerData.gender || 'male',
                status: fullWorkerData.status || 'active',
                service_id: fullWorkerData.services?.[0]?.id || ''
            });
        }
    }, [fullWorkerData, isEditMode, reset]);

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const payload = new FormData();
            payload.append('name', data.name);
            payload.append('phone_number', data.phone_number);
            payload.append('nationality', data.nationality);
            payload.append('id_number', data.id_number);
            payload.append('address', data.address);
            payload.append('gender', data.gender);
            payload.append('status', data.status);
            
            if (isEditMode) {
                payload.append('_method', 'PUT');
            }

            if (image && image[0]) {
                payload.append('image', image[0]);
            }

            if (data.service_id) {
                payload.append('services[]', data.service_id);
            }

            const url = isEditMode ? `/admin/workers/${workerToEdit.id}` : '/admin/workers';
            return axiosInstance.post(url, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم حفظ بيانات العامل بنجاح' : 'Worker details saved successfully'));
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            onClose();
        },
        onError: (error) => {
            const validationErrors = error.response?.data?.errors;
            if (validationErrors) {
                Object.entries(validationErrors).forEach(([key, messages]) => {
                    const message = Array.isArray(messages) ? messages[0] : messages;
                    setError(key, { type: 'server', message });
                });

                const firstErrKey = Object.keys(validationErrors)[0];
                const firstErrMsg = validationErrors[firstErrKey];
                const message = Array.isArray(firstErrMsg) ? firstErrMsg[0] : firstErrMsg;
                toast.error(message || (isArabic ? 'حدث خطأ في التحقق من البيانات.' : 'Validation error occurred.'));
            } else {
                const errorMsg = error.response?.data?.message;
                if (errorMsg && (errorMsg.includes('Phone') || errorMsg.includes('الهاتف'))) {
                    toast.error(isArabic ? 'رقم الهاتف مستخدم بالفعل من قبل عامل آخر.' : 'Phone number is already used by another worker.');
                } else if (errorMsg && (errorMsg.includes('ID') || errorMsg.includes('الهوية'))) {
                    toast.error(isArabic ? 'رقم الهوية مستخدم بالفعل من قبل عامل آخر.' : 'ID number is already used by another worker.');
                } else {
                    toast.error(errorMsg || (isArabic ? 'يرجى التحقق من صحة البيانات المدخلة.' : 'Please check the entered information.'));
                }
            }
        },
    });

    const onSubmit = (data) => submitMutation.mutate(data);
    const ErrorMsg = ({ name }) => errors[name] ? <p className="text-red-500 text-xs mt-1">{errors[name].message}</p> : null;

    return (
        <FullScreenFormModal
            title={isEditMode ? t('form.title_edit') : t('form.title_add')}
            onClose={onClose}
            formId="worker-form"
            onSubmit={handleSubmit(onSubmit)}
            isLoading={isEditMode && isWorkerLoading}
            isSubmitting={submitMutation.isPending}
            cancelLabel={t('form.cancel')}
            submitLabel={t('form.submit')}
        >
            {/* Basic info */}
            <FormSection icon="user" title={t('sections.details.title')} description={t('sections.details.desc')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('form.name')}</label>
                        <input {...register('name')} className={`${INPUT_CLASS} ${errors.name ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="name" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'رقم الهاتف' : 'Phone Number'}</label>
                        <input {...register('phone_number')} className={`${INPUT_CLASS} ${errors.phone_number ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="phone_number" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>{t('form.nationality')}</label>
                        <input {...register('nationality')} className={`${INPUT_CLASS} ${errors.nationality ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="nationality" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'رقم الهوية' : 'ID Number'}</label>
                        <input {...register('id_number')} className={`${INPUT_CLASS} ${errors.id_number ? 'border-red-500' : ''}`} />
                        <ErrorMsg name="id_number" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'الجنس' : 'Gender'}</label>
                        <SelectField registration={register('gender')}>
                            <option value="male">{isArabic ? 'ذكر' : 'Male'}</option>
                            <option value="female">{isArabic ? 'أنثى' : 'Female'}</option>
                        </SelectField>
                        <ErrorMsg name="gender" />
                    </div>
                </div>

                <div>
                    <label className={LABEL_CLASS}>{isArabic ? 'العنوان' : 'Address'}</label>
                    <textarea {...register('address')} rows="3" className={`${INPUT_CLASS} ${errors.address ? 'border-red-500' : ''}`} />
                    <ErrorMsg name="address" />
                </div>

                <div>
                    <label className={LABEL_CLASS}>{t('form.status')}</label>
                    <OptionCards
                        value={statusValue}
                        onChange={(v) => setValue('status', v, { shouldValidate: true })}
                        options={[
                            { value: 'active', label: t('status.active'), dot: 'bg-green-500' },
                            { value: 'inactive', label: t('status.inactive'), dot: 'bg-gray-400' },
                            { value: 'suspended', label: isArabic ? 'موقوف' : 'Suspended', dot: 'bg-red-500' },
                        ]}
                    />
                    <ErrorMsg name="status" />
                </div>

                <ImageDropzone
                    register={register}
                    watch={watch}
                    currentImage={isEditMode ? fullWorkerData?.image : null}
                    label={t('form.image')}
                    uploadText={t('form.upload_image')}
                    changeText={t('form.change_image')}
                />
            </FormSection>

            {/* Service Assignment */}
            <FormSection icon="briefcase" title={isArabic ? 'تعيين الخدمة' : 'Service Assignment'} description={isArabic ? 'اختر الخدمة التي ينتمي إليها هذا العامل' : 'Select the service this worker belongs to'}>
                <div>
                    <label className={LABEL_CLASS}>{isArabic ? 'الخدمة' : 'Service'}</label>
                    <SelectField registration={register('service_id')}>
                        <option value="">-- {isArabic ? 'غير معين' : 'Unassigned'} --</option>
                        {isServicesLoading ? (
                            <option disabled>{t('loading')}</option>
                        ) : (
                            (servicesList || []).map((service) => (
                                <option key={service.id} value={service.id}>
                                    {isArabic ? service.name_ar : service.name_en}
                                </option>
                            ))
                        )}
                    </SelectField>
                    <ErrorMsg name="service_id" />
                </div>
            </FormSection>
        </FullScreenFormModal>
    );
}
