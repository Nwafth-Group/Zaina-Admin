import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

export default function ReportDetailsModal({ reportId, onClose, onSuccess }) {
    const { t, i18n } = useTranslation('reports');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [adminNoteInput, setAdminNoteInput] = useState('');
    const [statusTransitionNote, setStatusTransitionNote] = useState('');
    const [assignedAdminId, setAssignedAdminId] = useState('');

    // Fetch report details
    const { data: report, isLoading, isError, refetch } = useQuery({
        queryKey: ['reportDetails', reportId],
        queryFn: async () => {
            const response = await axiosInstance.get(`/admin/reports/${reportId}`);
            return response.data.data;
        },
    });

    // Fetch employees list for assignment dropdown (filtered strictly to employees with reports permission)
    const { data: assignableEmployeesData, isLoading: isEmployeesLoading } = useQuery({
        queryKey: ['reportAssignableEmployees'],
        queryFn: async () => {
            const response = await axiosInstance.get('/admin/reports/assignable-employees');
            return response.data.data;
        },
    });
    const employees = Array.isArray(assignableEmployeesData) ? assignableEmployeesData : [];

    // Ensure currently assigned admin is preserved in the list
    const displayEmployees = React.useMemo(() => {
        const list = [...employees];
        if (report?.assigned_admin?.id && !list.some(e => e.id === report.assigned_admin.id)) {
            list.unshift(report.assigned_admin);
        }
        return list;
    }, [employees, report?.assigned_admin]);

    useEffect(() => {
        if (report?.assigned_admin?.id) {
            setAssignedAdminId(String(report.assigned_admin.id));
        }
    }, [report]);

    // Mutation: Assign report
    const assignMutation = useMutation({
        mutationFn: async (adminId) => {
            return axiosInstance.post(`/admin/reports/${reportId}/assign`, { admin_id: Number(adminId) });
        },
        onSuccess: (res) => {
            toast.success(isArabic ? 'تم تعيين البلاغ بنجاح' : 'Report assigned successfully');
            queryClient.invalidateQueries({ queryKey: ['reportDetails'] });
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            refetch();
            onSuccess?.();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Error assigning report');
        }
    });

    // Mutation: Add Internal Note
    const addNoteMutation = useMutation({
        mutationFn: async (noteText) => {
            return axiosInstance.post(`/admin/reports/${reportId}/notes`, { note: noteText });
        },
        onSuccess: () => {
            toast.success(isArabic ? 'تمت إضافة الملاحظة الداخلية بنجاح' : 'Internal notes added successfully');
            setAdminNoteInput('');
            queryClient.invalidateQueries({ queryKey: ['reportDetails'] });
            refetch();
            onSuccess?.();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Error adding notes');
        }
    });

    // Mutation: Update Status
    const updateStatusMutation = useMutation({
        mutationFn: async ({ status, note }) => {
            return axiosInstance.patch(`/admin/reports/${reportId}/status`, { status, note });
        },
        onSuccess: () => {
            toast.success(isArabic ? 'تم تحديث حالة البلاغ وإشعار العميل' : 'Report status updated and customer notified');
            setStatusTransitionNote('');
            queryClient.invalidateQueries({ queryKey: ['reportDetails'] });
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            refetch();
            onSuccess?.();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Error updating status');
        }
    });

    const handleAssignChange = (e) => {
        const val = e.target.value;
        setAssignedAdminId(val);
        if (val) {
            assignMutation.mutate(val);
        }
    };

    const handleAddNote = () => {
        if (!adminNoteInput.trim()) return;
        addNoteMutation.mutate(adminNoteInput);
    };

    const handleStatusUpdate = (status) => {
        updateStatusMutation.mutate({
            status,
            note: statusTransitionNote.trim() || `Status updated to ${status}`
        });
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full flex flex-col items-center justify-center gap-3">
                    <span className="w-8 h-8 border-3 border-t-transparent border-[#E91E63] rounded-full animate-spin"></span>
                    <span className="text-gray-500 text-sm font-medium">{t('loading')}</span>
                </div>
            </div>
        );
    }

    if (isError || !report) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full text-center">
                    <p className="text-red-500 font-bold mb-4">{isArabic ? 'حدث خطأ في تحميل البيانات' : 'Error loading details'}</p>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors">
                        {t('details.close')}
                    </button>
                </div>
            </div>
        );
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'submitted':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'under_review':
                return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'in_progress':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'resolved':
                return 'bg-green-50 text-green-700 border-green-200';
            case 'rejected':
                return 'bg-red-50 text-red-700 border-red-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F8F9FA]">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-800">
                            {t('details.title')}: <span className="text-[#E91E63]">{report.report_number || `REP-${report.id}`}</span>
                        </h3>
                        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(report.status)}`}>
                            {t(`status.${report.status}`)}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-full transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left Column: Details Cards */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* 1. Report Details Card */}
                        <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm space-y-3">
                            <h4 className="font-bold text-gray-800 border-b border-gray-50 pb-2">{t('details.info_section')}</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-400 block text-xs">{t('details.reason_label')}</span>
                                    <span className="font-semibold text-gray-700">{t(`reasons.${report.reason}`)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-xs">{isArabic ? 'تاريخ التقديم' : 'Submitted At'}</span>
                                    <span className="font-semibold text-gray-700">{report.created_at}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-gray-400 block text-xs">{t('details.description_label')}</span>
                                    <p className="bg-[#F8F9FA] p-3 rounded-xl text-gray-600 mt-1 border border-gray-100 whitespace-pre-line">
                                        {report.description || (isArabic ? 'لا يوجد تفاصيل إضافية' : 'No extra details supplied.')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Booking & Service Details Card */}
                        <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm space-y-4">
                            <h4 className="font-bold text-gray-800 border-b border-gray-50 pb-2">{t('details.booking_section')}</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-400 block text-xs">{isArabic ? 'رقم الحجز المرجعي' : 'Booking Reference'}</span>
                                    <span className="font-semibold text-[#E91E63]">{report.booking_ref || `#${report.booking_id}`}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-xs">{isArabic ? 'تاريخ الخدمة' : 'Booking Date'}</span>
                                    <span className="font-semibold text-gray-700">{report.booking_date || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-xs">{isArabic ? 'توقيت الحجز' : 'Start Time'}</span>
                                    <span className="font-semibold text-gray-700">{report.booking_start_time || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-xs">{isArabic ? 'المدة' : 'Duration'}</span>
                                    <span className="font-semibold text-gray-700">{report.booking_duration ? `${report.booking_duration} ${isArabic ? 'ساعات' : 'hours'}` : '—'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-xs">{isArabic ? 'مبلغ الحجز' : 'Booking Total'}</span>
                                    <span className="font-bold text-gray-700">{report.booking_amount} EGP</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-xs">{isArabic ? 'حالة الدفع' : 'Payment Status'}</span>
                                    <span className="font-semibold text-gray-700 capitalize">{report.booking_payment_status || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Customer Details Card */}
                        <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm space-y-3">
                            <h4 className="font-bold text-gray-800 border-b border-gray-50 pb-2">{t('details.customer_section')}</h4>
                            {report.customer ? (
                                <div className="text-sm space-y-2">
                                    <div>
                                        <span className="text-gray-400 block text-xs">{isArabic ? 'اسم العميل' : 'Customer Name'}</span>
                                        <span className="font-semibold text-gray-700">{report.customer.name}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block text-xs">{isArabic ? 'رقم الجوال' : 'Mobile Number'}</span>
                                        <span className="font-semibold text-gray-700">{report.customer.phone_number}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block text-xs">{isArabic ? 'البريد الإلكتروني' : 'Email Address'}</span>
                                        <span className="font-semibold text-gray-700">{report.customer.email || '—'}</span>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-gray-400 text-sm">{isArabic ? 'لا توجد بيانات للعميل' : 'No customer details available.'}</span>
                            )}
                        </div>

                        {/* 4. History/Timeline log */}
                        <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm space-y-4">
                            <h4 className="font-bold text-gray-800 border-b border-gray-50 pb-2">{t('details.history_section')}</h4>
                            {report.history && report.history.length > 0 ? (
                                <div className="relative border-l border-gray-100 ltr:pl-4 rtl:pr-4 space-y-4">
                                    {report.history.map((hist) => (
                                        <div key={hist.id} className="relative">
                                            <div className="absolute -left-[21px] top-1.5 w-3.5 h-3.5 bg-white border-2 border-[#E91E63] rounded-full"></div>
                                            <div className="text-sm">
                                                <span className="font-semibold text-gray-800 block">
                                                    {isArabic ? 'تغيير الحالة إلى' : 'Status changed to'}:{' '}
                                                    <span className="text-[#E91E63]">{t(`status.${hist.new_status}`)}</span>
                                                </span>
                                                <span className="text-gray-500 text-xs mt-1 block">
                                                    {hist.created_by_name} • {hist.created_at}
                                                </span>
                                                {hist.note && (
                                                    <p className="text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 mt-2 text-xs">
                                                        {hist.note}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm">{t('details.no_history')}</p>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Actions Sidebar */}
                    <div className="space-y-6">
                        
                        {/* Assignment Section */}
                        <div className="bg-[#F8F9FA] p-5 rounded-2xl border border-gray-100 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-gray-800 text-sm">{t('details.assigned_admin_label')}</h4>
                                {isEmployeesLoading && (
                                    <span className="text-xs text-gray-400 animate-pulse">
                                        {isArabic ? 'جاري التحميل...' : 'Loading...'}
                                    </span>
                                )}
                            </div>
                            <select
                                value={assignedAdminId}
                                onChange={handleAssignChange}
                                disabled={assignMutation.isLoading || isEmployeesLoading}
                                className="w-full bg-white text-gray-800 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63]"
                            >
                                <option value="">{t('details.assign_placeholder')}</option>
                                {displayEmployees.map((emp) => (
                                    <option key={emp.id} value={String(emp.id)} className="text-gray-800 bg-white">
                                        {emp.full_name || emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}
                                        {emp.primary_role ? ` (${emp.primary_role})` : ''}
                                    </option>
                                ))}
                            </select>
                            {displayEmployees.length === 0 && !isEmployeesLoading && (
                                <p className="text-xs text-amber-600 mt-1">
                                    {isArabic
                                        ? 'لا يوجد موظفون لديهم صلاحية متابعة التذاكر (reports.edit).'
                                        : 'No employees found with reports permission (reports.edit).'}
                                </p>
                            )}
                        </div>

                        {report.status !== 'resolved' && (
                            <>
                                {/* Note area for status changes */}
                                <div className="bg-[#F8F9FA] p-5 rounded-2xl border border-gray-100 space-y-3">
                                    <h4 className="font-bold text-gray-800 text-sm">{isArabic ? 'ملاحظة تحديث الحالة (تظهر للعميل)' : 'Status update note (visible to client)'}</h4>
                                    <textarea
                                        value={statusTransitionNote}
                                        onChange={(e) => setStatusTransitionNote(e.target.value)}
                                        placeholder={isArabic ? 'أدخل تفاصيل التحديث أو سبب الرفض/الحل...' : 'Enter note for status transition/resolution...'}
                                        rows={3}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] resize-none"
                                    />
                                </div>

                                {/* Status Actions */}
                                <div className="bg-[#F8F9FA] p-5 rounded-2xl border border-gray-100 space-y-3">
                                    <h4 className="font-bold text-gray-800 text-sm">{t('details.change_status_btn')}</h4>
                                    
                                    <div className="flex flex-col gap-2">
                                        {report.status === 'submitted' && (
                                            <div className="space-y-2 w-full">
                                                <button
                                                    onClick={() => handleStatusUpdate('under_review')}
                                                    className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-sm font-medium transition-colors"
                                                >
                                                    {t('status.under_review')}
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate('resolved')}
                                                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
                                                >
                                                    {t('details.resolve_btn')}
                                                </button>
                                            </div>
                                        )}

                                        {report.status === 'under_review' && (
                                            <button
                                                onClick={() => handleStatusUpdate('resolved')}
                                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
                                            >
                                                {t('details.resolve_btn')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Admin Notes Section */}
                        <div className="bg-[#F8F9FA] p-5 rounded-2xl border border-gray-100 space-y-3">
                            <h4 className="font-bold text-gray-800 text-sm">{t('details.notes_section')}</h4>
                            
                            <div className="space-y-3">
                                {report.admin_notes ? (
                                    <p className="text-xs text-gray-600 bg-white p-3 rounded-xl border border-gray-100 max-h-48 overflow-y-auto whitespace-pre-line">
                                        {report.admin_notes}
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-400">{t('details.no_notes')}</p>
                                )}

                                <div className="space-y-2">
                                    <textarea
                                        value={adminNoteInput}
                                        onChange={(e) => setAdminNoteInput(e.target.value)}
                                        placeholder={t('details.add_note_placeholder')}
                                        rows={2}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#E91E63] focus:border-[#E91E63] resize-none"
                                    />
                                    <button
                                        onClick={handleAddNote}
                                        className="w-full px-4 py-1.5 bg-[#E91E63] text-white hover:bg-[#c2185b] rounded-xl text-xs font-medium transition-colors"
                                    >
                                        {t('details.add_note_btn')}
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 flex justify-end bg-[#F8F9FA]">
                    <button onClick={onClose} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors">
                        {t('details.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
