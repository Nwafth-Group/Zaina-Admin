import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import RowActionsMenu, { EditIcon, CancelIcon } from '../../component/RowActionsMenu.jsx';

export default function LegalDocuments() {
    const { t, i18n } = useTranslation('legal_documents');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    const [selectedTab, setSelectedTab] = useState('all'); // all, terms, privacy, about_us
    const [modalState, setModalState] = useState({ isOpen: false, document: null });
    const [deleteTarget, setDeleteTarget] = useState(null);

    const lastCountsRef = useRef({ all: 0, terms: 0, privacy: 0, about_us: 0 });

    // Queries
    const { data: responseData, isLoading, isError, error } = useQuery({
        queryKey: ['legal-documents', selectedTab],
        queryFn: async () => {
            const url = selectedTab === 'all' ? '/admin/legal-documents' : `/admin/legal-documents?type=${selectedTab}`;
            const res = await axiosInstance.get(url);
            return res.data.data;
        }
    });

    const documents = Array.isArray(responseData) ? responseData : (responseData?.items || []);

    if (responseData?.counts) {
        lastCountsRef.current = responseData.counts;
    } else if (documents.length > 0 && selectedTab === 'all') {
        lastCountsRef.current = {
            all: documents.length,
            terms: documents.filter(d => d.type === 'terms').length,
            privacy: documents.filter(d => d.type === 'privacy').length,
            about_us: documents.filter(d => d.type === 'about_us').length,
        };
    }
    const counts = lastCountsRef.current;

    // Mutations
    const saveMutation = useMutation({
        mutationFn: async ({ id, payload }) => {
            if (id) {
                return (await axiosInstance.put(`/admin/legal-documents/${id}`, payload)).data;
            } else {
                return (await axiosInstance.post('/admin/legal-documents', payload)).data;
            }
        },
        onSuccess: () => {
            toast.success(t('save_success'));
            queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
            setModalState({ isOpen: false, document: null });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || err.message || 'Error occurred');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            return (await axiosInstance.delete(`/admin/legal-documents/${id}`)).data;
        },
        onSuccess: () => {
            toast.success(t('delete_success'));
            queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
            setDeleteTarget(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || err.message || 'Error occurred');
        }
    });

    if (isError) return <div className="p-8 text-red-500 font-bold">{error.message}</div>;

    const openCreateModal = () => {
        setModalState({
            isOpen: true,
            document: {
                type: 'terms',
                title_ar: '',
                title_en: '',
                content_ar: '',
                content_en: '',
                sort_order: 0,
                is_active: true
            }
        });
    };

    const openEditModal = (doc) => {
        setModalState({
            isOpen: true,
            document: { ...doc }
        });
    };

    const getGroupedDocuments = () => {
        const groups = {};
        if (selectedTab === 'all' || selectedTab === 'terms') {
            groups.terms = {
                title: t('terms'),
                items: documents.filter(d => d.type === 'terms'),
                color: 'blue'
            };
        }
        if (selectedTab === 'all' || selectedTab === 'privacy') {
            groups.privacy = {
                title: t('privacy'),
                items: documents.filter(d => d.type === 'privacy'),
                color: 'purple'
            };
        }
        if (selectedTab === 'all' || selectedTab === 'about_us') {
            groups.about_us = {
                title: t('about_us'),
                items: documents.filter(d => d.type === 'about_us'),
                color: 'emerald'
            };
        }
        return groups;
    };

    const cardTabs = [
        { key: 'all', label: isArabic ? 'جميع الوثائق' : 'All Documents', count: counts.all, icon: '📄', color: 'bg-[#FDF0F3] border-[#fbdbe3]' },
        { key: 'terms', label: t('terms'), count: counts.terms, icon: '📜', color: 'bg-blue-50 border-blue-200' },
        { key: 'privacy', label: t('privacy'), count: counts.privacy, icon: '🔒', color: 'bg-purple-50 border-purple-200' },
        { key: 'about_us', label: t('about_us'), count: counts.about_us, icon: 'ℹ️', color: 'bg-emerald-50 border-emerald-200' },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'إدارة الوثائق والسياسات القانونية' : 'Legal Documents & Terms'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'تحديث وصياغة الشروط والأحكام، سياسة الخصوصية، ومن نحن.' : 'Manage terms & conditions, privacy policy, and company legal info.'}
                    </p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="bg-[#E91E63] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#D81B60] transition shadow-sm flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{t('add_new')}</span>
                </button>
            </div>

            {/* Metric Tabs Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {cardTabs.map((card) => {
                    const isActive = selectedTab === card.key;
                    return (
                        <button
                            key={card.key}
                            onClick={() => setSelectedTab(card.key)}
                            className={`p-4 rounded-xl border text-start transition-all flex items-center justify-between ${
                                isActive ? `${card.color} ring-2 ring-[#E91E63]/30 shadow-sm` : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            <div>
                                <p className="text-xs font-bold text-gray-500">{card.label}</p>
                                <p className="text-2xl font-black text-gray-900 mt-1">{card.count ?? 0}</p>
                            </div>
                            <div className="text-2xl">{card.icon}</div>
                        </button>
                    );
                })}
            </div>

            {/* Content List */}
            <div className="space-y-6">
                {isLoading ? (
                    <div className="flex justify-center items-center gap-2 py-16 text-gray-500 font-bold text-xs bg-white rounded-2xl border border-gray-200">
                        <svg className="animate-spin h-4 w-4 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                        </svg>
                        <span>{isArabic ? 'جاري التحميل...' : 'Loading...'}</span>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 font-bold text-xs bg-white rounded-2xl border border-gray-200">{t('empty')}</div>
                ) : (
                    Object.entries(getGroupedDocuments()).map(([key, group]) => {
                        if (group.items.length === 0) return null;
                        return (
                            <div key={key} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                    <h3 className="font-extrabold text-gray-900 flex items-center gap-2 text-sm">
                                        <span className={`w-2.5 h-2.5 rounded-full ${
                                            group.color === 'blue' ? 'bg-blue-500' : group.color === 'purple' ? 'bg-purple-500' : 'bg-emerald-500'
                                        }`} />
                                        {group.title}
                                    </h3>
                                    <span className="text-[11px] text-gray-500 font-bold bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                                        {isArabic ? `${group.items.length} بنود` : `${group.items.length} items`}
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-center border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">
                                                <th scope="col" className="py-3.5 px-4 text-center">{isArabic ? 'العنوان العربي' : 'Arabic Title'}</th>
                                                <th scope="col" className="py-3.5 px-4 text-center">{isArabic ? 'العنوان الإنجليزي' : 'English Title'}</th>
                                                <th scope="col" className="py-3.5 px-4 text-center">{t('sort_order')}</th>
                                                <th scope="col" className="py-3.5 px-4 text-center">{t('status')}</th>
                                                <th scope="col" className="py-3.5 px-4 text-center w-28">{t('actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                                            {group.items.map((doc) => (
                                                <tr key={doc.id} className="hover:bg-gray-50/80 transition-colors text-center">
                                                    <td className="py-3 px-4 text-center font-bold text-gray-900">{doc.title_ar}</td>
                                                    <td className="py-3 px-4 text-center font-medium text-gray-700">{doc.title_en}</td>
                                                    <td className="py-3 px-4 text-center font-bold text-gray-600 font-mono">{doc.sort_order}</td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${
                                                            doc.is_active
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${doc.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                            {doc.is_active ? t('active') : t('inactive')}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <div className="flex justify-center">
                                                            <RowActionsMenu
                                                                label={isArabic ? 'خيارات' : 'Options'}
                                                                items={[
                                                                    {
                                                                        key: 'edit',
                                                                        label: isArabic ? 'تعديل' : 'Edit',
                                                                        icon: <EditIcon />,
                                                                        onClick: () => openEditModal(doc)
                                                                    },
                                                                    {
                                                                        key: 'delete',
                                                                        label: isArabic ? 'حذف' : 'Delete',
                                                                        icon: <CancelIcon />,
                                                                        onClick: () => setDeleteTarget(doc.id)
                                                                    }
                                                                ]}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Save/Edit Modal */}
            {modalState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <h3 className="text-lg font-extrabold text-gray-900">
                            {modalState.document.id ? (isArabic ? 'تعديل البند' : 'Edit Section') : (isArabic ? 'إضافة بند جديد' : 'Add New Section')}
                        </h3>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                saveMutation.mutate({
                                    id: modalState.document.id,
                                    payload: modalState.document
                                });
                            }}
                            className="space-y-4 text-xs"
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">{isArabic ? 'نوع الوثيقة' : 'Document Type'}</label>
                                    <select
                                        value={modalState.document.type}
                                        onChange={(e) => setModalState(s => ({ ...s, document: { ...s.document, type: e.target.value } }))}
                                        className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#E91E63]"
                                    >
                                        <option value="terms">{t('terms')}</option>
                                        <option value="privacy">{t('privacy')}</option>
                                        <option value="about_us">{t('about_us')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">{t('sort_order')}</label>
                                    <input
                                        type="number"
                                        value={modalState.document.sort_order}
                                        onChange={(e) => setModalState(s => ({ ...s, document: { ...s.document, sort_order: Number(e.target.value) } }))}
                                        className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#E91E63]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">{isArabic ? 'العنوان بالعربية' : 'Arabic Title'}</label>
                                    <input
                                        type="text"
                                        required
                                        value={modalState.document.title_ar}
                                        onChange={(e) => setModalState(s => ({ ...s, document: { ...s.document, title_ar: e.target.value } }))}
                                        className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#E91E63]"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">{isArabic ? 'العنوان بالإنجليزية' : 'English Title'}</label>
                                    <input
                                        type="text"
                                        required
                                        value={modalState.document.title_en}
                                        onChange={(e) => setModalState(s => ({ ...s, document: { ...s.document, title_en: e.target.value } }))}
                                        className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#E91E63]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">{isArabic ? 'المحتوى بالعربية' : 'Arabic Content'}</label>
                                <textarea
                                    rows="4"
                                    required
                                    value={modalState.document.content_ar}
                                    onChange={(e) => setModalState(s => ({ ...s, document: { ...s.document, content_ar: e.target.value } }))}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#E91E63]"
                                ></textarea>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">{isArabic ? 'المحتوى بالإنجليزية' : 'English Content'}</label>
                                <textarea
                                    rows="4"
                                    required
                                    value={modalState.document.content_en}
                                    onChange={(e) => setModalState(s => ({ ...s, document: { ...s.document, content_en: e.target.value } }))}
                                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#E91E63]"
                                ></textarea>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={modalState.document.is_active}
                                    onChange={(e) => setModalState(s => ({ ...s, document: { ...s.document, is_active: e.target.checked } }))}
                                    className="rounded border-gray-300 text-[#E91E63] focus:ring-[#E91E63]"
                                />
                                <label htmlFor="is_active" className="font-bold text-gray-700 cursor-pointer">{t('active')}</label>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setModalState({ isOpen: false, document: null })}
                                    className="px-4 py-2 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                                >
                                    {isArabic ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saveMutation.isPending}
                                    className="px-4 py-2 rounded-lg font-bold text-white bg-[#E91E63] hover:bg-[#D81B60] transition shadow-sm"
                                >
                                    {saveMutation.isPending ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ' : 'Save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100 text-center">
                        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
                            ⚠️
                        </div>
                        <h3 className="text-base font-extrabold text-gray-900">
                            {isArabic ? 'تأكيد الحذف' : 'Confirm Deletion'}
                        </h3>
                        <p className="text-xs text-gray-500">
                            {isArabic ? 'هل أنت متأكد من حذف هذا البند القانوني؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this legal section? This action cannot be undone.'}
                        </p>
                        <div className="flex justify-center gap-2 pt-2">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="px-4 py-2 rounded-lg font-bold text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                            >
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate(deleteTarget)}
                                disabled={deleteMutation.isPending}
                                className="px-4 py-2 rounded-lg font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 transition shadow-sm"
                            >
                                {deleteMutation.isPending ? (isArabic ? 'جاري الحذف...' : 'Deleting...') : (isArabic ? 'تأكيد الحذف' : 'Confirm Delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
