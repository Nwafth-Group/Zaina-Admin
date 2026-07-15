import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import Pagination from '../../component/Pagination.jsx';

export default function PointsManagement() {
    const { t, i18n } = useTranslation('common');
    const queryClient = useQueryClient();
    const isArabic = i18n.language?.startsWith('ar');

    // Tabs state
    const [activeTab, setActiveTab] = useState('rules');

    // Earning Rules state
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [ruleForm, setRuleForm] = useState({
        title_ar: '',
        title_en: '',
        subtitle_ar: '',
        subtitle_en: '',
        points: 50,
        rule_category: 'social_media',
        status: true,
        action_type: 'url',
        action_link: '',
        trigger_event: '',
        required_booking_count: '',
        frequency_type: 'one_time',
        eligible_services: [],
        calculation_method: 'fixed',
        points_expiration_months: '',
    });

    // Global Redemption settings state
    const settingsForm = {
        points_conversion_rate: 10,
        min_redemption_points: 100,
        max_discount_percentage: 50,
        points_expiration_months: 12,
        include_taxes_in_points: false,
    };

    // Service settings state
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [serviceForm, setServiceForm] = useState({
        points_redemption_enabled: false,
        points_redemption_method: 'fixed',
        points_required_fixed: 0,
        points_conversion_rate: 10,
    });

    // Transactions pagination & filter state
    const [txPage, setTxPage] = useState(1);
    const [txTypeFilter, setTxTypeFilter] = useState('');
    const [txSearchInput, setTxSearchInput] = useState('');
    const [txSearch, setTxSearch] = useState('');

    // Manual adjustment state
    const [customerSearchInput, setCustomerSearchInput] = useState('');
    const [customerResults, setCustomerResults] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
    const [adjustmentForm, setAdjustmentForm] = useState({
        action: 'credit',
        amount: '',
        reason: '',
    });

    // Debounce search in transactions
    useEffect(() => {
        const id = setTimeout(() => {
            setTxSearch(txSearchInput.trim());
            setTxPage(1);
        }, 400);
        return () => clearTimeout(id);
    }, [txSearchInput]);

    // Query for Earning Rules
    const { data: rulesData, isLoading: isRulesLoading } = useQuery({
        queryKey: ['points-rules'],
        queryFn: async () => {
            const response = await axiosInstance.get('/admin/points/rules');
            return response.data.data;
        },
    });

    const isSettingsLoading = false;

    // Query for Services points settings
    const { data: servicesData, isLoading: isServicesLoading } = useQuery({
        queryKey: ['points-services'],
        queryFn: async () => {
            const response = await axiosInstance.get('/admin/points/services');
            return response.data.data;
        },
    });

    // Query for Transactions with paging & filters
    const txQueryString = new URLSearchParams({
        page: String(txPage),
        type: txTypeFilter,
        search: txSearch,
    }).toString();

    const { data: txData, isLoading: isTxLoading } = useQuery({
        queryKey: ['points-transactions', txQueryString],
        queryFn: async () => {
            const response = await axiosInstance.get(`/admin/points/transactions?${txQueryString}`);
            return response.data.data;
        },
        keepPreviousData: true,
    });

    // Customer search for adjustments
    useEffect(() => {
        if (!customerSearchInput.trim()) {
            setCustomerResults([]);
            return;
        }
        const delayDebounce = setTimeout(async () => {
            setIsSearchingCustomers(true);
            try {
                const response = await axiosInstance.get(`/admin/users?type=customer&search=${customerSearchInput}`);
                setCustomerResults(response.data.data.items || []);
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearchingCustomers(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [customerSearchInput]);

    // Create / Update Rule mutation
    const saveRuleMutation = useMutation({
        mutationFn: async (payload) => {
            if (editingRule) {
                return await axiosInstance.put(`/admin/points/rules/${editingRule.id}`, payload);
            } else {
                return await axiosInstance.post('/admin/points/rules', payload);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['points-rules']);
            toast.success(editingRule ? 'Rule updated successfully' : 'Rule created successfully');
            setIsRuleModalOpen(false);
            setEditingRule(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to save rule');
        },
    });

    // Delete Rule mutation
    const deleteRuleMutation = useMutation({
        mutationFn: async (id) => {
            return await axiosInstance.delete(`/admin/points/rules/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['points-rules']);
            toast.success('Rule deleted successfully');
        },
        onError: () => {
            toast.error('Failed to delete rule');
        },
    });



    // Update Service Points configuration mutation
    const saveServicePointsMutation = useMutation({
        mutationFn: async ({ id, payload }) => {
            return await axiosInstance.put(`/admin/points/services/${id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['points-services']);
            toast.success('Service points configurations updated successfully');
            setIsServiceModalOpen(false);
            setEditingService(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to update service points');
        },
    });

    // Manual Adjustment mutation
    const submitAdjustmentMutation = useMutation({
        mutationFn: async (payload) => {
            return await axiosInstance.post('/admin/points/manual-adjustment', payload);
        },
        onSuccess: (res) => {
            toast.success('Manual points adjustment processed successfully');
            setAdjustmentForm({ action: 'credit', amount: '', reason: '' });
            setSelectedCustomer(null);
            setCustomerSearchInput('');
            queryClient.invalidateQueries(['points-transactions']);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to apply adjustment');
        },
    });

    const handleRuleFormSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...ruleForm,
            points: Number(ruleForm.points),
            status: Boolean(ruleForm.status),
            required_booking_count: ruleForm.required_booking_count ? Number(ruleForm.required_booking_count) : null,
            points_expiration_months: ruleForm.points_expiration_months ? Number(ruleForm.points_expiration_months) : null,
        };
        saveRuleMutation.mutate(payload);
    };



    const handleServiceFormSubmit = (e) => {
        e.preventDefault();
        saveServicePointsMutation.mutate({
            id: editingService.id,
            payload: {
                points_redemption_enabled: Boolean(serviceForm.points_redemption_enabled),
                points_redemption_method: serviceForm.points_redemption_method,
                points_required_fixed: Number(serviceForm.points_required_fixed),
                points_conversion_rate: Number(serviceForm.points_conversion_rate),
            },
        });
    };

    const handleAdjustmentSubmit = (e) => {
        e.preventDefault();
        if (!selectedCustomer) {
            toast.error('Please select a customer first');
            return;
        }
        submitAdjustmentMutation.mutate({
            user_id: selectedCustomer.id,
            action: adjustmentForm.action,
            amount: Number(adjustmentForm.amount),
            reason: adjustmentForm.reason,
        });
    };

    const openCreateRuleModal = () => {
        setEditingRule(null);
        setRuleForm({
            title_ar: '',
            title_en: '',
            subtitle_ar: '',
            subtitle_en: '',
            points: 50,
            rule_category: 'social_media',
            status: true,
            action_type: 'url',
            action_link: '',
            trigger_event: '',
            required_booking_count: '',
            frequency_type: 'one_time',
            eligible_services: [],
            calculation_method: 'fixed',
            points_expiration_months: '',
        });
        setIsRuleModalOpen(true);
    };

    const openEditRuleModal = (rule) => {
        setEditingRule(rule);
        setRuleForm({
            title_ar: rule.title_ar || '',
            title_en: rule.title_en || '',
            subtitle_ar: rule.subtitle_ar || '',
            subtitle_en: rule.subtitle_en || '',
            points: rule.points || 0,
            rule_category: rule.rule_category || 'social_media',
            status: Boolean(rule.status),
            action_type: rule.action_type || 'url',
            action_link: rule.action_link || '',
            trigger_event: rule.trigger_event || '',
            required_booking_count: rule.required_booking_count || '',
            frequency_type: rule.frequency_type || 'one_time',
            eligible_services: rule.eligible_services || [],
            calculation_method: rule.calculation_method || 'fixed',
            points_expiration_months: rule.points_expiration_months || '',
        });
        setIsRuleModalOpen(true);
    };

    const openEditServiceModal = (svc) => {
        setEditingService(svc);
        setServiceForm({
            points_redemption_enabled: Boolean(svc.points_redemption_enabled),
            points_redemption_method: svc.points_redemption_method || 'fixed',
            points_required_fixed: svc.points_required_fixed || 0,
            points_conversion_rate: svc.points_conversion_rate || 10,
        });
        setIsServiceModalOpen(true);
    };

    return (
        <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
                        {isArabic ? 'إدارة نقاط الولاء' : 'Loyalty Points Management'}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {isArabic ? 'تكوين قواعد كسب النقاط، إعدادات الاسترداد، وتعديل أرصدة العملاء.' : 'Configure earning rules, redemption settings, and adjust customer balances.'}
                    </p>
                </div>
                {activeTab === 'rules' && (
                    <button
                        onClick={openCreateRuleModal}
                        className="bg-[#E91E63] text-white px-5 py-3 rounded-xl shadow-md hover:bg-[#c2185b] transition-all duration-150 font-semibold text-sm flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {isArabic ? 'إضافة قاعدة جديدة' : 'Add New Rule'}
                    </button>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto gap-1 mb-6 bg-white p-2 rounded-2xl shadow-sm">
                {[
                    { id: 'rules', label: isArabic ? 'قواعد كسب النقاط' : 'Earning Rules' },
                    { id: 'services', label: isArabic ? 'نقاط الخدمات' : 'Service Points' },
                    { id: 'adjustments', label: isArabic ? 'اضافة نقاط للمستخدمين' : 'Add Points to Users' },
                    { id: 'transactions', label: isArabic ? 'سجل العمليات' : 'Transactions Log' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-shrink-0 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-150 ${
                            activeTab === tab.id
                            ? 'bg-[#FDF0F3] text-[#E91E63]'
                            : 'text-gray-500 hover:text-[#E91E63] hover:bg-gray-50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab: Earning Rules */}
            {activeTab === 'rules' && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left rtl:text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="p-4 md:p-5">{isArabic ? 'الاسم' : 'Name'}</th>
                                    <th className="p-4 md:p-5">{isArabic ? 'الفئة' : 'Category'}</th>
                                    <th className="p-4 md:p-5">{isArabic ? 'النقاط' : 'Points'}</th>
                                    <th className="p-4 md:p-5">{isArabic ? 'التكرار' : 'Frequency'}</th>
                                    <th className="p-4 md:p-5">{isArabic ? 'الحالة' : 'Status'}</th>
                                    <th className="p-4 md:p-5 text-right rtl:text-left">{isArabic ? 'خيارات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                {isRulesLoading ? (
                                    <tr>
                                        <td colSpan="6" className="text-center p-8 text-gray-400">
                                            {isArabic ? 'جاري التحميل...' : 'Loading rules...'}
                                        </td>
                                    </tr>
                                ) : !rulesData || rulesData.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center p-8 text-gray-400">
                                            {isArabic ? 'لا توجد قواعد مضافة بعد.' : 'No points earning rules found.'}
                                        </td>
                                    </tr>
                                ) : (
                                    rulesData.map(rule => (
                                        <tr key={rule.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 md:p-5 font-semibold text-gray-800">
                                                <div>{isArabic ? rule.title_ar : rule.title_en}</div>
                                                <div className="text-xs text-gray-400 font-normal mt-0.5">
                                                    {isArabic ? rule.subtitle_ar : rule.subtitle_en}
                                                </div>
                                            </td>
                                            <td className="p-4 md:p-5">
                                                <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-semibold uppercase">
                                                    {rule.rule_category}
                                                </span>
                                            </td>
                                            <td className="p-4 md:p-5 text-[#E91E63] font-bold">
                                                {rule.points} {isArabic ? 'نقطة' : 'Pts'}
                                            </td>
                                            <td className="p-4 md:p-5">
                                                <span className="text-gray-500 capitalize text-xs">
                                                    {rule.frequency_type?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-4 md:p-5">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                    rule.status
                                                    ? 'bg-emerald-50 text-emerald-600'
                                                    : 'bg-red-50 text-red-600'
                                                }`}>
                                                    {rule.status ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Inactive')}
                                                </span>
                                            </td>
                                            <td className="p-4 md:p-5 text-right rtl:text-left">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditRuleModal(rule)}
                                                        className="text-gray-400 hover:text-[#E91E63] p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm(isArabic ? 'هل أنت متأكد من حذف هذه القاعدة؟' : 'Are you sure you want to delete this rule?')) {
                                                                deleteRuleMutation.mutate(rule.id);
                                                            }
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
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
                </div>
            )}

            {/* Tab: Service point settings */}
            {activeTab === 'services' && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left rtl:text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="p-4 md:p-5">{isArabic ? 'كود الخدمة' : 'Service Code'}</th>
                                    <th className="p-4 md:p-5">{isArabic ? 'اسم الخدمة' : 'Service Name'}</th>
                                    <th className="p-4 md:p-5">{isArabic ? 'السعر الأساسي' : 'Base Price'}</th>
                                    <th className="p-4 md:p-5">{isArabic ? 'إمكانية الدفع بالنقاط' : 'Pay by Points'}</th>
                                    <th className="p-4 md:p-5">{isArabic ? 'طريقة الاحتساب' : 'Calculation'}</th>
                                    <th className="p-4 md:p-5">{isArabic ? 'النقاط المطلوبة' : 'Required Points'}</th>
                                    <th className="p-4 md:p-5 text-right rtl:text-left">{isArabic ? 'تعديل' : 'Edit'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                {isServicesLoading ? (
                                    <tr>
                                        <td colSpan="7" className="text-center p-8 text-gray-400">
                                            {isArabic ? 'جاري التحميل...' : 'Loading services...'}
                                        </td>
                                    </tr>
                                ) : !servicesData || servicesData.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center p-8 text-gray-400">
                                            {isArabic ? 'لا توجد خدمات مضافة.' : 'No services found.'}
                                        </td>
                                    </tr>
                                ) : (
                                    servicesData.map(svc => (
                                        <tr key={svc.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 md:p-5 font-mono text-xs font-bold text-gray-500">
                                                {svc.service_code}
                                            </td>
                                            <td className="p-4 md:p-5 font-semibold text-gray-800">
                                                {isArabic ? svc.name_ar : svc.name_en}
                                            </td>
                                            <td className="p-4 md:p-5 font-bold">
                                                {svc.base_price} EGP
                                            </td>
                                            <td className="p-4 md:p-5">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                    svc.points_redemption_enabled
                                                    ? 'bg-emerald-50 text-emerald-600'
                                                    : 'bg-gray-50 text-gray-500'
                                                }`}>
                                                    {svc.points_redemption_enabled ? (isArabic ? 'متاح' : 'Enabled') : (isArabic ? 'غير متاح' : 'Disabled')}
                                                </span>
                                            </td>
                                            <td className="p-4 md:p-5 capitalize text-xs">
                                                {svc.points_redemption_method === 'fixed' ? (isArabic ? 'ثابت' : 'Fixed') : (isArabic ? 'نسبة السعر' : 'Price-based')}
                                            </td>
                                            <td className="p-4 md:p-5 text-[#E91E63] font-bold">
                                                {svc.points_redemption_method === 'fixed'
                                                    ? `${svc.points_required_fixed} Pts`
                                                    : `1 EGP = ${svc.points_conversion_rate} Pts`
                                                }
                                            </td>
                                            <td className="p-4 md:p-5 text-right rtl:text-left">
                                                <button
                                                    onClick={() => openEditServiceModal(svc)}
                                                    className="text-[#E91E63] hover:text-[#c2185b] font-semibold text-xs transition-colors"
                                                >
                                                    {isArabic ? 'تعديل الإعدادات' : 'Configure'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab: Manual Adjustments */}
            {activeTab === 'adjustments' && (
                <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                    <h2 className="text-xl font-bold text-gray-800">
                        {isArabic ? 'اضافة نقاط للمستخدمين' : 'Add Points to Users'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {isArabic ? 'حدد العميل وابحث عن اسمه، ثم اختر خصم أو إضافة نقاط مع كتابة السبب.' : 'Select customer by name or phone, then choose to add/deduct points and provide a reason.'}
                    </p>

                    <form onSubmit={handleAdjustmentSubmit} className="space-y-5">
                        {/* Customer Search select */}
                        <div className="relative">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                {isArabic ? 'البحث عن العميل' : 'Search Customer'}
                            </label>
                            <input
                                type="text"
                                placeholder={isArabic ? 'ابحث عن العميل بالاسم أو رقم الهاتف...' : 'Type client name or mobile number...'}
                                value={customerSearchInput}
                                onChange={(e) => setCustomerSearchInput(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#E91E63]"
                            />
                            {customerResults.length > 0 && (
                                <div className="absolute left-0 right-0 bg-white border border-gray-150 rounded-xl mt-1 shadow-lg max-h-56 overflow-y-auto z-10 divide-y divide-gray-50">
                                    {customerResults.map(cust => (
                                        <button
                                            key={cust.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCustomer(cust);
                                                setCustomerResults([]);
                                                setCustomerSearchInput('');
                                            }}
                                            className="w-full text-left rtl:text-right px-4 py-3 hover:bg-gray-50 flex justify-between items-center transition-colors"
                                        >
                                            <div>
                                                <div className="font-semibold text-gray-800">{cust.full_name}</div>
                                                <div className="text-xs text-gray-400">{cust.phone_number} / {cust.email}</div>
                                            </div>
                                            <div className="bg-rose-50 text-[#E91E63] font-bold text-xs px-2.5 py-1 rounded-full">
                                                {cust.points || 0} Pts
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {isSearchingCustomers && (
                                <div className="absolute right-4 top-10 text-xs text-gray-400">
                                    {isArabic ? 'جاري البحث...' : 'Searching...'}
                                </div>
                            )}
                        </div>

                        {selectedCustomer && (
                            <div className="bg-[#FDF0F3] border border-[#fbdbe3] p-4 rounded-2xl flex justify-between items-center">
                                <div>
                                    <div className="text-xs text-rose-500 font-bold uppercase tracking-wider">
                                        {isArabic ? 'العميل المختار' : 'Selected Customer'}
                                    </div>
                                    <div className="font-bold text-gray-800 text-base mt-1">{selectedCustomer.full_name}</div>
                                    <div className="text-xs text-gray-500">{selectedCustomer.phone_number}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-400 font-bold uppercase">{isArabic ? 'الرصيد الحالي' : 'Current Balance'}</div>
                                    <div className="text-[#E91E63] text-xl font-extrabold mt-0.5">{selectedCustomer.points || 0} Pts</div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setAdjustmentForm({ ...adjustmentForm, action: 'credit' })}
                                className={`py-4 rounded-2xl font-bold text-sm border transition-all ${
                                    adjustmentForm.action === 'credit'
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {isArabic ? 'إضافة نقاط (+)' : 'Credit Points (+)'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setAdjustmentForm({ ...adjustmentForm, action: 'debit' })}
                                className={`py-4 rounded-2xl font-bold text-sm border transition-all ${
                                    adjustmentForm.action === 'debit'
                                    ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {isArabic ? 'خصم نقاط (-)' : 'Debit Points (-)'}
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                {isArabic ? 'عدد النقاط' : 'Amount of Points'}
                            </label>
                            <input
                                type="number"
                                min="1"
                                placeholder="e.g. 100"
                                value={adjustmentForm.amount}
                                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#E91E63]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                {isArabic ? 'سبب التعديل' : 'Reason / Note'}
                            </label>
                            <textarea
                                rows="3"
                                placeholder={isArabic ? 'اكتب تفاصيل التعديل (مطلوب)...' : 'Write details for adjustment (required)...'}
                                value={adjustmentForm.reason}
                                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#E91E63]"
                                required
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={submitAdjustmentMutation.isLoading}
                            className={`w-full text-white py-4 rounded-xl shadow-md font-bold text-sm transition-all duration-150 ${
                                adjustmentForm.action === 'credit'
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                        >
                            {submitAdjustmentMutation.isLoading
                                ? (isArabic ? 'جاري المعالجة...' : 'Processing...')
                                : (isArabic ? 'تأكيد العملية' : 'Confirm Action')
                            }
                        </button>
                    </form>
                </div>
            )}

            {/* Tab: Transactions history */}
            {activeTab === 'transactions' && (
                <div className="space-y-6">
                    {/* Filters bar */}
                    <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="flex gap-2 overflow-x-auto w-full md:w-auto">
                            {[
                                { value: '', label: isArabic ? 'جميع العمليات' : 'All Types' },
                                { value: 'earn', label: isArabic ? 'كسب' : 'Earn' },
                                { value: 'redeem', label: isArabic ? 'استرداد' : 'Redeem' },
                                { value: 'refund', label: isArabic ? 'إرجاع' : 'Refund' },
                                { value: 'expire', label: isArabic ? 'انتهاء الصلاحية' : 'Expire' },
                                { value: 'adjustment', label: isArabic ? 'اضافة نقاط للمستخدمين' : 'Add Points to Users' },
                            ].map(item => (
                                <button
                                    key={item.value}
                                    onClick={() => { setTxTypeFilter(item.value); setTxPage(1); }}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                                        txTypeFilter === item.value
                                        ? 'bg-[#E91E63] text-white shadow-sm'
                                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <div className="w-full md:w-80">
                            <input
                                type="text"
                                placeholder={isArabic ? 'البحث بالاسم، البريد أو الجوال...' : 'Search by name, email or phone...'}
                                value={txSearchInput}
                                onChange={(e) => setTxSearchInput(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm"
                            />
                        </div>
                    </div>

                    {/* Table ledger */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left rtl:text-right border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="p-4 md:p-5">{isArabic ? 'العميل' : 'Customer'}</th>
                                        <th className="p-4 md:p-5">{isArabic ? 'النوع' : 'Type'}</th>
                                        <th className="p-4 md:p-5">{isArabic ? 'النقاط' : 'Amount'}</th>
                                        <th className="p-4 md:p-5">{isArabic ? 'الرصيد السابق/اللاحق' : 'Before/After'}</th>
                                        <th className="p-4 md:p-5">{isArabic ? 'البيان' : 'Description'}</th>
                                        <th className="p-4 md:p-5">{isArabic ? 'التاريخ' : 'Date'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                    {isTxLoading ? (
                                        <tr>
                                            <td colSpan="6" className="text-center p-8 text-gray-400">
                                                {isArabic ? 'جاري التحميل...' : 'Loading transactions...'}
                                            </td>
                                        </tr>
                                    ) : !txData || !txData.items || txData.items.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center p-8 text-gray-400">
                                                {isArabic ? 'لا توجد قيود مسجلة.' : 'No transactions recorded.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        txData.items.map(tx => {
                                            const isAdjustmentCredit = tx.type === 'adjustment' && tx.amount > 0;
                                            const isAdjustmentDebit = tx.type === 'adjustment' && tx.amount < 0;
                                            const isCredit = tx.type === 'earn' || tx.type === 'refund' || isAdjustmentCredit;

                                            return (
                                                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="p-4 md:p-5 font-semibold text-gray-800">
                                                        {tx.user ? (
                                                            <div>
                                                                <div>{tx.user.full_name}</div>
                                                                <div className="text-xs text-gray-400 font-normal mt-0.5">{tx.user.phone_number}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">{isArabic ? 'مستخدم غير معروف' : 'Unknown User'}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 md:p-5">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                            tx.type === 'earn' ? 'bg-emerald-50 text-emerald-600' :
                                                            tx.type === 'redeem' ? 'bg-rose-50 text-[#E91E63]' :
                                                            tx.type === 'refund' ? 'bg-blue-50 text-blue-600' :
                                                            tx.type === 'expire' ? 'bg-gray-100 text-gray-600' :
                                                            'bg-amber-50 text-amber-700'
                                                        }`}>
                                                            {tx.type}
                                                        </span>
                                                    </td>
                                                    <td className={`p-4 md:p-5 font-bold ${
                                                        isCredit ? 'text-emerald-600' : 'text-red-500'
                                                    }`}>
                                                        {isCredit ? '+' : '-'}{Math.abs(tx.amount)} Pts
                                                    </td>
                                                    <td className="p-4 md:p-5 text-gray-500 text-xs font-mono">
                                                        {tx.points_before} &rarr; {tx.points_after}
                                                    </td>
                                                    <td className="p-4 md:p-5">
                                                        <div className="font-medium">{isArabic ? tx.title_ar : tx.title_en}</div>
                                                        {(tx.reason || tx.created_by) && (
                                                            <div className="text-xs text-gray-400 mt-1">
                                                                {tx.reason && <span>{isArabic ? 'السبب: ' : 'Reason: '}{tx.reason}</span>}
                                                                {tx.created_by && <span className="mx-1">({isArabic ? 'بواسطة: ' : 'By: '}{tx.created_by})</span>}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 md:p-5 text-xs text-gray-400 font-medium">
                                                        {new Date(tx.created_at).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination footer */}
                        {txData?.meta && txData.meta.last_page > 1 && (
                            <div className="p-4 border-t border-gray-100">
                                <Pagination
                                    meta={txData.meta}
                                    setPage={setTxPage}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal: Create/Edit Earning Rule */}
            {isRuleModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setIsRuleModalOpen(false)}
                            className="absolute top-5 right-5 text-gray-400 hover:text-red-500 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <h2 className="text-2xl font-bold text-gray-800 mb-6">
                            {editingRule ? (isArabic ? 'تعديل القاعدة' : 'Edit Earning Rule') : (isArabic ? 'إضافة قاعدة جديدة' : 'Add New Earning Rule')}
                        </h2>

                        <form onSubmit={handleRuleFormSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'الاسم (عربي)' : 'Name (Arabic)'}</label>
                                    <input
                                        type="text"
                                        value={ruleForm.title_ar}
                                        onChange={(e) => setRuleForm({ ...ruleForm, title_ar: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'الاسم (إنجليزي)' : 'Name (English)'}</label>
                                    <input
                                        type="text"
                                        value={ruleForm.title_en}
                                        onChange={(e) => setRuleForm({ ...ruleForm, title_en: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'الوصف الفرعي (عربي)' : 'Subtitle (Arabic)'}</label>
                                    <input
                                        type="text"
                                        value={ruleForm.subtitle_ar}
                                        onChange={(e) => setRuleForm({ ...ruleForm, subtitle_ar: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'الوصف الفرعي (إنجليزي)' : 'Subtitle (English)'}</label>
                                    <input
                                        type="text"
                                        value={ruleForm.subtitle_en}
                                        onChange={(e) => setRuleForm({ ...ruleForm, subtitle_en: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'نوع القاعدة' : 'Rule Category'}</label>
                                    <select
                                        value={ruleForm.rule_category}
                                        onChange={(e) => setRuleForm({ ...ruleForm, rule_category: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm bg-white"
                                    >
                                        <option value="social_media">Social Media</option>
                                        <option value="referral">Referral</option>
                                        <option value="booking">Booking Complete</option>
                                        <option value="booking_count">Booking Count Cycle</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'عدد النقاط المكتسبة' : 'Points Value'}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={ruleForm.points}
                                        onChange={(e) => setRuleForm({ ...ruleForm, points: Number(e.target.value) })}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'نوع التكرار' : 'Frequency'}</label>
                                    <select
                                        value={ruleForm.frequency_type}
                                        onChange={(e) => setRuleForm({ ...ruleForm, frequency_type: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm bg-white"
                                    >
                                        <option value="one_time">One Time</option>
                                        <option value="repeatable">Repeatable</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'الحالة' : 'Status'}</label>
                                    <select
                                        value={ruleForm.status ? '1' : '0'}
                                        onChange={(e) => setRuleForm({ ...ruleForm, status: e.target.value === '1' })}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm bg-white"
                                    >
                                        <option value="1">Active</option>
                                        <option value="0">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {ruleForm.rule_category === 'booking_count' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'عدد الحجوزات المطلوبة للدورة' : 'Required Booking Count'}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="e.g. 3"
                                        value={ruleForm.required_booking_count}
                                        onChange={(e) => setRuleForm({ ...ruleForm, required_booking_count: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm"
                                        required
                                    />
                                </div>
                            )}

                            {ruleForm.rule_category === 'social_media' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'نوع الإجراء' : 'Action Type'}</label>
                                        <select
                                            value={ruleForm.action_type}
                                            onChange={(e) => setRuleForm({ ...ruleForm, action_type: e.target.value })}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm bg-white"
                                        >
                                            <option value="url">Open Link (URL)</option>
                                            <option value="invite_friend">Invite Friend</option>
                                            <option value="rate_service">Rate Service</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'رابط الإجراء (URL)' : 'Action Link'}</label>
                                        <input
                                            type="text"
                                            placeholder="https://..."
                                            value={ruleForm.action_link}
                                            onChange={(e) => setRuleForm({ ...ruleForm, action_link: e.target.value })}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'صلاحية النقاط بالشهور لهذه القاعدة' : 'Points Validity (Months)'}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder={isArabic ? 'تلقائي من الإعدادات العامة' : 'Default from settings'}
                                        value={ruleForm.points_expiration_months}
                                        onChange={(e) => setRuleForm({ ...ruleForm, points_expiration_months: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'حدث التفعيل البرمجي' : 'Trigger Event Name'}</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. facebook_follow"
                                        value={ruleForm.trigger_event}
                                        onChange={(e) => setRuleForm({ ...ruleForm, trigger_event: e.target.value })}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saveRuleMutation.isLoading}
                                className="w-full bg-[#E91E63] text-white py-3 rounded-xl shadow-md hover:bg-[#c2185b] transition-all font-bold text-sm mt-2"
                            >
                                {saveRuleMutation.isLoading ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ القاعدة' : 'Save Rule')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Service points mapping */}
            {isServiceModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative">
                        <button
                            onClick={() => setIsServiceModalOpen(false)}
                            className="absolute top-5 right-5 text-gray-400 hover:text-red-500 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <h2 className="text-xl font-bold text-gray-800 mb-6">
                            {isArabic ? 'تعديل إعدادات استرداد نقاط الخدمة' : 'Configure Service Redemption Points'}
                        </h2>

                        <form onSubmit={handleServiceFormSubmit} className="space-y-4">
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm font-semibold text-gray-700">
                                {editingService ? (isArabic ? editingService.name_ar : editingService.name_en) : ''}
                            </div>

                            <div className="flex items-center gap-3 py-2">
                                <input
                                    type="checkbox"
                                    id="points_redemption_enabled"
                                    checked={serviceForm.points_redemption_enabled}
                                    onChange={(e) => setServiceForm({ ...serviceForm, points_redemption_enabled: e.target.checked })}
                                    className="w-5 h-5 accent-[#E91E63] rounded border-gray-300"
                                />
                                <label htmlFor="points_redemption_enabled" className="text-sm font-bold text-gray-700 cursor-pointer">
                                    {isArabic ? 'تفعيل استرداد النقاط لهذه الخدمة' : 'Allow Booking this Service with Points'}
                                </label>
                            </div>

                            {serviceForm.points_redemption_enabled && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'طريقة احتساب النقاط' : 'Points Calculation Method'}</label>
                                        <select
                                            value={serviceForm.points_redemption_method}
                                            onChange={(e) => setServiceForm({ ...serviceForm, points_redemption_method: e.target.value })}
                                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm bg-white"
                                        >
                                            <option value="fixed">Fixed Points per Service Booking</option>
                                            <option value="price_based">Points calculated based on Service Price</option>
                                        </select>
                                    </div>

                                    {serviceForm.points_redemption_method === 'fixed' ? (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'النقاط المطلوبة الكاملة' : 'Required Fixed Points'}</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={serviceForm.points_required_fixed}
                                                onChange={(e) => setServiceForm({ ...serviceForm, points_required_fixed: Number(e.target.value) })}
                                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm"
                                                required
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{isArabic ? 'سعر النقاط (1 جنيه = X نقطة)' : 'Service conversion rate (1 Currency = X points)'}</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={serviceForm.points_conversion_rate}
                                                onChange={(e) => setServiceForm({ ...serviceForm, points_conversion_rate: Number(e.target.value) })}
                                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#E91E63] text-sm"
                                                required
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            <button
                                type="submit"
                                disabled={saveServicePointsMutation.isLoading}
                                className="w-full bg-[#E91E63] text-white py-3 rounded-xl shadow-md hover:bg-[#c2185b] transition-all font-bold text-sm mt-2"
                            >
                                {saveServicePointsMutation.isLoading ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ إعدادات الخدمة' : 'Save Configurations')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
