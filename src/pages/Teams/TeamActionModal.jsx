import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import FullScreenFormModal from '../../components/form/FullScreenFormModal';
import {
    INPUT_CLASS,
    LABEL_CLASS,
    OptionCards,
    FormSection,
} from '../../components/form/FormKit';

export default function TeamActionModal({ teamToEdit, isOpen, onClose, onSuccess }) {
    const { i18n } = useTranslation();
    const queryClient = useQueryClient();
    const isEditMode = !!teamToEdit;
    const isArabic = i18n.language?.startsWith('ar');

    const [workerSearch, setWorkerSearch] = useState('');

    // Fetch team details in edit mode
    const { data: teamDetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: ['team-action-details', teamToEdit?.id],
        queryFn: async () => {
            const res = await axiosInstance.get(`/admin/teams/${teamToEdit.id}`);
            return res.data?.data;
        },
        enabled: isEditMode && isOpen && !!teamToEdit?.id,
    });

    // Fetch male workers available for team assignment
    const { data: workersResp, isLoading: isWorkersLoading } = useQuery({
        queryKey: ['team-available-workers', teamToEdit?.id],
        queryFn: async () => {
            const url = isEditMode
                ? `/admin/workers?gender=male&no_team_only=true&include_team_id=${teamToEdit.id}&per_page=100`
                : '/admin/workers?gender=male&no_team_only=true&per_page=100';
            const res = await axiosInstance.get(url);
            return res.data?.data?.items || [];
        },
        enabled: isOpen,
    });
    const availableWorkers = workersResp || [];

    // Fetch specialized services (6 to 11)
    const { data: servicesResp, isLoading: isServicesLoading } = useQuery({
        queryKey: ['team-specialized-services'],
        queryFn: async () => {
            const res = await axiosInstance.get('/admin/services?per_page=100');
            const allServices = res.data?.data?.items || [];
            return allServices.filter((s) => s.is_team_based);
        },
        enabled: isOpen,
    });
    const specializedServices = servicesResp || [];

    const schema = yup.object().shape({
        name_ar: yup.string().required(isArabic ? 'اسم الفريق بالعربية مطلوب' : 'Arabic name is required'),
        name_en: yup.string().required(isArabic ? 'اسم الفريق بالإنجليزية مطلوب' : 'English name is required'),
        code: yup.string().required(isArabic ? 'رمز الفريق مطلوب' : 'Team code is required'),
        status: yup.string().oneOf(['active', 'inactive']).required(),
        notes: yup.string().nullable().notRequired(),
        worker_ids: yup
            .array()
            .of(yup.number())
            .min(1, isArabic ? 'يجب اختيار عامل واحد على الأقل لتكوين الفريق' : 'Must select at least 1 male worker')
            .required(isArabic ? 'يجب اختيار عمال الفريق' : 'Team workers are required'),
        service_ids: yup.array().of(yup.number()).nullable(),
    });

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            name_ar: '',
            name_en: '',
            code: '',
            status: 'active',
            notes: '',
            worker_ids: [],
            service_ids: [],
        },
    });

    const statusValue = watch('status');
    const selectedWorkerIds = watch('worker_ids') || [];
    const selectedServiceIds = watch('service_ids') || [];

    useEffect(() => {
        if (isEditMode && teamDetails) {
            reset({
                name_ar: teamDetails.name_ar || '',
                name_en: teamDetails.name_en || '',
                code: teamDetails.code || '',
                status: teamDetails.status || 'active',
                notes: teamDetails.notes || '',
                worker_ids: teamDetails.workers?.map((w) => w.id) || [],
                service_ids: teamDetails.services?.map((s) => s.id) || [],
            });
        } else if (!isEditMode && isOpen) {
            reset({
                name_ar: '',
                name_en: '',
                code: `TEAM-${String(Math.floor(10 + Math.random() * 90))}`,
                status: 'active',
                notes: '',
                worker_ids: [],
                service_ids: [],
            });
        }
    }, [isEditMode, teamDetails, isOpen, reset]);

    const handleWorkerToggle = (workerId) => {
        const idNum = Number(workerId);
        if (selectedWorkerIds.includes(idNum)) {
            setValue('worker_ids', selectedWorkerIds.filter((id) => id !== idNum), { shouldValidate: true });
        } else {
            setValue('worker_ids', [...selectedWorkerIds, idNum], { shouldValidate: true });
        }
    };

    const handleServiceToggle = (serviceId) => {
        const idNum = Number(serviceId);
        const next = selectedServiceIds.includes(idNum)
            ? selectedServiceIds.filter((id) => id !== idNum)
            : [...selectedServiceIds, idNum];
        setValue('service_ids', next, { shouldValidate: true });
    };

    const mutation = useMutation({
        mutationFn: async (formData) => {
            if (isEditMode) {
                return axiosInstance.put(`/admin/teams/${teamToEdit.id}`, formData);
            }
            return axiosInstance.post('/admin/teams', formData);
        },
        onSuccess: (res) => {
            toast.success(res.data?.message || (isArabic ? 'تم حفظ بيانات الفريق بنجاح' : 'Team saved successfully'));
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            queryClient.invalidateQueries({ queryKey: ['team-details'] });
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            queryClient.invalidateQueries({ queryKey: ['services'] });
            onSuccess?.();
            onClose();
        },
        onError: (err) => {
            const msg = err.response?.data?.message || (isArabic ? 'حدث خطأ أثناء الحفظ' : 'Error saving team');
            toast.error(msg);
        },
    });

    const onSubmit = (data) => {
        mutation.mutate(data);
    };

    const filteredWorkers = availableWorkers.filter((w) => {
        if (!workerSearch.trim()) return true;
        const q = workerSearch.toLowerCase();
        return (
            w.name?.toLowerCase().includes(q) ||
            w.phone_number?.includes(q) ||
            w.nationality?.toLowerCase().includes(q)
        );
    });

    const ErrorMsg = ({ name }) =>
        errors[name] ? <p className="text-xs text-red-500 mt-1">{errors[name].message}</p> : null;

    if (!isOpen) return null;

    return (
        <FullScreenFormModal
            title={
                isEditMode
                    ? (isArabic ? 'تعديل بيانات فريق العمل' : 'Edit Work Team')
                    : (isArabic ? 'إضافة فريق عمل جديد' : 'New Work Team')
            }
            onClose={onClose}
            formId="team-form"
            onSubmit={handleSubmit(onSubmit)}
            isLoading={isEditMode && isDetailsLoading}
            isSubmitting={mutation.isPending}
            cancelLabel={isArabic ? 'إلغاء' : 'Cancel'}
            submitLabel={
                mutation.isPending
                    ? (isArabic ? 'جاري الحفظ...' : 'Saving...')
                    : isEditMode
                    ? (isArabic ? 'تحديث الفريق' : 'Update Team')
                    : (isArabic ? 'حفظ وإنشاء الفريق' : 'Create Team')
            }
        >
            {/* Section 1: Basic Information */}
            <FormSection
                icon="users"
                title={isArabic ? 'معلومات الفريق الأساسية' : 'Basic Team Information'}
                description={
                    isArabic
                        ? 'تحديد اسم الفريق باللغتين والكود التعريفي والحالة التشغيلية'
                        : 'Define the team name in Arabic & English, unique code, and status.'
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>
                            {isArabic ? 'اسم الفريق (بالعربية)' : 'Team Name (Arabic)'} *
                        </label>
                        <input
                            type="text"
                            {...register('name_ar')}
                            dir="rtl"
                            placeholder={isArabic ? 'مثال: فريق تنظيف الكنب 1' : 'Arabic team name'}
                            className={INPUT_CLASS}
                        />
                        <ErrorMsg name="name_ar" />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>
                            {isArabic ? 'اسم الفريق (بالإنجليزية)' : 'Team Name (English)'} *
                        </label>
                        <input
                            type="text"
                            {...register('name_en')}
                            dir="ltr"
                            placeholder="e.g. Sofa Cleaning Team 1"
                            className={INPUT_CLASS}
                        />
                        <ErrorMsg name="name_en" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>
                            {isArabic ? 'رمز الفريق (الكود)' : 'Team Code'} *
                        </label>
                        <input
                            type="text"
                            {...register('code')}
                            dir="ltr"
                            placeholder="e.g. TEAM-01"
                            className={`${INPUT_CLASS} font-mono uppercase`}
                        />
                        <ErrorMsg name="code" />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>{isArabic ? 'الحالة التشغيلية' : 'Status'} *</label>
                        <OptionCards
                            value={statusValue}
                            onChange={(v) => setValue('status', v, { shouldValidate: true })}
                            options={[
                                { value: 'active', label: isArabic ? 'نشط' : 'Active', dot: 'bg-emerald-500' },
                                { value: 'inactive', label: isArabic ? 'معطل' : 'Inactive', dot: 'bg-gray-400' },
                            ]}
                        />
                        <ErrorMsg name="status" />
                    </div>
                </div>

                <div>
                    <label className={LABEL_CLASS}>
                        {isArabic ? 'ملاحظات وتفاصيل إضافية' : 'Notes'}
                    </label>
                    <textarea
                        {...register('notes')}
                        rows={3}
                        placeholder={
                            isArabic
                                ? 'أي ملاحظات تشغيلية خاصة بالفريق، المعدات، أو التغطية الجغرافية...'
                                : 'Optional notes about team equipment, territory, or operations...'
                        }
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#E91E63] focus:ring-2 focus:ring-[#E91E63]/10 transition-all bg-white font-medium text-gray-800 placeholder:text-gray-400 resize-none"
                    ></textarea>
                    <ErrorMsg name="notes" />
                </div>
            </FormSection>

            {/* Section 2: Team Members (Male Workers) */}
            <FormSection
                icon="user"
                title={isArabic ? 'أعضاء الفريق (العمال الذكور)' : 'Team Members (Male Workers)'}
                description={
                    isArabic
                        ? 'إسناد العمال الذكور للفريق. تذكر: العامل يتبع فريقاً واحداً فقط تشغيلياً وقاعدياً.'
                        : 'Assign male workers to this team. Note: each worker belongs to exactly one team.'
                }
                action={
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                        selectedWorkerIds.length > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-[#E91E63]/10 text-[#E91E63]'
                    }`}>
                        {selectedWorkerIds.length > 0
                            ? (isArabic ? `✅ تم اختيار ${selectedWorkerIds.length} ${selectedWorkerIds.length === 1 ? 'عامل' : 'عمال'}` : `✅ ${selectedWorkerIds.length} Worker${selectedWorkerIds.length > 1 ? 's' : ''} Selected`)
                            : (isArabic ? 'اختر عمال الفريق (1 أو أكثر)' : 'Select workers (1 or more)')}
                    </span>
                }
            >
                {/* Search */}
                <div className="relative">
                    <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400 pointer-events-none">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        value={workerSearch}
                        onChange={(e) => setWorkerSearch(e.target.value)}
                        placeholder={isArabic ? 'ابحث بالاسم، رقم الهاتف، أو الجنسية...' : 'Search workers by name, phone, nationality...'}
                        className="w-full ps-9 pe-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#E91E63] focus:border-[#E91E63] outline-none"
                    />
                </div>

                {/* Worker Cards Grid */}
                <div className="max-h-64 overflow-y-auto space-y-2 p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                    {isWorkersLoading ? (
                        <div className="text-center py-8 text-xs text-gray-400 flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                            <span>{isArabic ? 'جاري تحميل العمال المتاحين...' : 'Loading available workers...'}</span>
                        </div>
                    ) : filteredWorkers.length === 0 ? (
                        <div className="text-center py-8 text-xs text-gray-400">
                            {isArabic
                                ? 'لا يوجد عمال ذكور متاحين للإسناد (غير مرتبطين بفرق أخرى).'
                                : 'No available male workers found.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {filteredWorkers.map((worker) => {
                                const isSelected = selectedWorkerIds.includes(worker.id);
                                return (
                                    <div
                                        key={worker.id}
                                        onClick={() => handleWorkerToggle(worker.id)}
                                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-pink-50/70 border-[#E91E63] shadow-xs ring-1 ring-[#E91E63]/30'
                                                : 'bg-white border-gray-200/80 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-full bg-pink-100/60 border border-pink-200 text-[#E91E63] flex items-center justify-center overflow-hidden font-bold text-xs shrink-0">
                                                {worker.image ? (
                                                    <img src={worker.image} alt={worker.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    worker.name?.charAt(0) || 'W'
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-900 truncate">{worker.name}</p>
                                                <p className="text-[11px] text-gray-500 font-mono truncate">{worker.phone_number}</p>
                                                <p className="text-[10px] text-gray-400 truncate">{worker.nationality || '—'}</p>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}}
                                            className="w-4 h-4 text-[#E91E63] rounded border-gray-300 focus:ring-[#E91E63]"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <ErrorMsg name="worker_ids" />
            </FormSection>

            {/* Section 3: Specialized Services Assignment (6-11) */}
            <FormSection
                icon="briefcase"
                title={isArabic ? 'إسناد الخدمات التخصصية (من 6 إلى 11)' : 'Specialized Services (6 to 11)'}
                description={
                    isArabic
                        ? 'تحديد الخدمات التخصصية التي يقدمها هذا الفريق (يمكن إسناد الفريق لأكثر من خدمة تخصصية).'
                        : 'Select the specialized services this team will perform (teams can be assigned to multiple specialized services).'
                }
                action={
                    <span className="px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-700 rounded-lg">
                        {selectedServiceIds.length} {isArabic ? 'خدمات محددة' : 'selected'}
                    </span>
                }
            >
                <div className="max-h-64 overflow-y-auto space-y-2 p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                    {isServicesLoading ? (
                        <div className="text-center py-8 text-xs text-gray-400 flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                            <span>{isArabic ? 'جاري تحميل الخدمات التخصصية...' : 'Loading specialized services...'}</span>
                        </div>
                    ) : specializedServices.length === 0 ? (
                        <div className="text-center py-8 text-xs text-gray-400">
                            {isArabic ? 'لا توجد خدمات تخصصية مسجلة في النظام.' : 'No specialized services found.'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {specializedServices.map((service) => {
                                const isSelected = selectedServiceIds.includes(service.id);
                                return (
                                    <div
                                        key={service.id}
                                        onClick={() => handleServiceToggle(service.id)}
                                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-purple-50/60 border-purple-500 shadow-xs ring-1 ring-purple-400/30'
                                                : 'bg-white border-gray-200/80 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                            />
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-900 truncate">
                                                    {isArabic ? service.name_ar : service.name_en || service.name_ar}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-mono truncate">
                                                    {service.service_code || `SVC-${service.id}`}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-purple-100 text-purple-700 shrink-0">
                                            {isArabic ? 'خدمة تخصصية' : 'Specialized'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <ErrorMsg name="service_ids" />
            </FormSection>
        </FullScreenFormModal>
    );
}
