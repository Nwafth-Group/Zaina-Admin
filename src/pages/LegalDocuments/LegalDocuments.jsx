import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import RowActionsMenu, { EditIcon, CancelIcon } from '../../component/RowActionsMenu.jsx';

export default function LegalDocuments() {
    const { t, i18n } = useTranslation('legal_documents');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();

    // Staged filter (Terms / Privacy / About Us / All)
    const [selectedTab, setSelectedTab] = useState('all'); // all, terms, privacy, about_us
    const [modalState, setModalState] = useState({ isOpen: false, document: null });
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Queries
    const { data: documents = [], isLoading, isError, error } = useQuery({
        queryKey: ['legal-documents', selectedTab],
        queryFn: async () => {
            const url = selectedTab === 'all' ? '/admin/legal-documents' : `/admin/legal-documents?type=${selectedTab}`;
            const res = await axiosInstance.get(url);
            // Handle both { items: [...] } wrapping and flat arrays
            return res.data.data?.items || res.data.data || [];
        }
    });

    // Mutations
    const saveMutation = useMutation({
        mutationFn: async ({ id, payload }) => {
            if (id) {
                return (await axiosInstance.put(`/admin/legal-documents/${id}`, payload)).data;
            } else {
                return (await axiosInstance.post('/admin/legal-documents', payload)).data;
            }
        },
        onSuccess: (res) => {
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

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col min-h-[70vh]">
            
            {/* Header section */}
            <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('title')}</h2>
                </div>

                <button
                    onClick={openCreateModal}
                    className="bg-[#E91E63] text-white px-5 py-2 rounded-full font-medium hover:bg-[#D81B60] transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {t('add_new')}
                </button>
            </div>

            {/* Quick tabs */}
            <div className="px-4 md:px-6 py-2.5 border-b border-gray-50 flex items-center gap-1 overflow-x-auto">
                {[
                    { value: 'all', label: isArabic ? 'الكل' : 'All' },
                    { value: 'terms', label: t('terms') },
                    { value: 'privacy', label: t('privacy') },
                    { value: 'about_us', label: t('about_us') }
                ].map((tab) => {
                    const active = selectedTab === tab.value;
                    return (
                        <button
                            key={tab.value}
                            onClick={() => setSelectedTab(tab.value)}
                            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                active ? 'bg-[#E91E63] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content List */}
            <div className="flex-1 p-4 md:p-6 space-y-8 overflow-y-auto max-h-[75vh]">
                {isLoading ? (
                    <div className="flex justify-center items-center gap-3 py-16 text-gray-500">
                        <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                        </svg>
                        <span className="text-lg font-medium">{isArabic ? 'جاري التحميل...' : 'Loading...'}</span>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="py-16 text-center text-gray-500 font-medium">{t('empty')}</div>
                ) : (
                    Object.entries(getGroupedDocuments()).map(([key, group]) => {
                        if (group.items.length === 0) return null;
                        return (
                            <div key={key} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${
                                            group.color === 'blue' ? 'bg-blue-500' : group.color === 'purple' ? 'bg-purple-500' : 'bg-emerald-500'
                                        }`} />
                                        {group.title}
                                    </h3>
                                    <span className="text-xs text-gray-400 font-semibold bg-gray-100 px-2 py-0.5 rounded-full">
                                        {isArabic ? `${group.items.length} بنود` : `${group.items.length} items`}
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 min-w-[700px]">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50/30 border-b border-gray-100/50">
                                            <tr>
                                                <th scope="col" className="px-6 py-4">{isArabic ? 'العنوان العربي' : 'Arabic Title'}</th>
                                                <th scope="col" className="px-6 py-4">{isArabic ? 'العنوان الإنجليزي' : 'English Title'}</th>
                                                <th scope="col" className="px-6 py-4 text-center">{t('sort_order')}</th>
                                                <th scope="col" className="px-6 py-4 text-center">{t('status')}</th>
                                                <th scope="col" className="px-6 py-4 text-center">{t('actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {group.items.map((doc) => (
                                                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{doc.title_ar}</td>
                                                    <td className="px-6 py-4 text-gray-600">{doc.title_en}</td>
                                                    <td className="px-6 py-4 text-center font-semibold text-gray-700">{doc.sort_order}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                            doc.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {doc.is_active ? t('active') : t('inactive')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
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
                <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 backdrop-blur-sm flex justify-center items-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-800">
                                {modalState.document?.id ? t('edit_document') : t('add_new')}
                            </h3>
                            <button
                                onClick={() => setModalState({ isOpen: false, document: null })}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                saveMutation.mutate({
                                    id: modalState.document?.id,
                                    payload: modalState.document
                                });
                            }}
                            className="p-6 space-y-4"
                        >
                            {/* Type selector */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('type')}</label>
                                <select
                                    value={modalState.document.type}
                                    onChange={(e) => setModalState(prev => ({ ...prev, document: { ...prev.document, type: e.target.value } }))}
                                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E91E63]/20 focus:border-[#E91E63] transition-all bg-white"
                                    required
                                >
                                    <option value="terms">{t('terms')}</option>
                                    <option value="privacy">{t('privacy')}</option>
                                    <option value="about_us">{t('about_us')}</option>
                                </select>
                            </div>

                            {/* Titles */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('title_ar')}</label>
                                    <input
                                        type="text"
                                        value={modalState.document.title_ar}
                                        onChange={(e) => setModalState(prev => ({ ...prev, document: { ...prev.document, title_ar: e.target.value } }))}
                                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E91E63]/20 focus:border-[#E91E63] transition-all"
                                        required
                                        dir="rtl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('title_en')}</label>
                                    <input
                                        type="text"
                                        value={modalState.document.title_en}
                                        onChange={(e) => setModalState(prev => ({ ...prev, document: { ...prev.document, title_en: e.target.value } }))}
                                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E91E63]/20 focus:border-[#E91E63] transition-all"
                                        required
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            {/* Contents */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('content_ar')}</label>
                                <textarea
                                    value={modalState.document.content_ar}
                                    onChange={(e) => setModalState(prev => ({ ...prev, document: { ...prev.document, content_ar: e.target.value } }))}
                                    rows={4}
                                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E91E63]/20 focus:border-[#E91E63] transition-all font-mono"
                                    required
                                    dir="rtl"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('content_en')}</label>
                                <textarea
                                    value={modalState.document.content_en}
                                    onChange={(e) => setModalState(prev => ({ ...prev, document: { ...prev.document, content_en: e.target.value } }))}
                                    rows={4}
                                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E91E63]/20 focus:border-[#E91E63] transition-all font-mono"
                                    required
                                    dir="ltr"
                                />
                            </div>

                            {/* Options */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t('sort_order')}</label>
                                    <input
                                        type="number"
                                        value={modalState.document.sort_order}
                                        onChange={(e) => setModalState(prev => ({ ...prev, document: { ...prev.document, sort_order: parseInt(e.target.value) || 0 } }))}
                                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E91E63]/20 focus:border-[#E91E63] transition-all"
                                    />
                                </div>
                                <div className="flex items-center gap-3.5 pt-7">
                                    <input
                                        id="is_active_toggle"
                                        type="checkbox"
                                        checked={modalState.document.is_active}
                                        onChange={(e) => setModalState(prev => ({ ...prev, document: { ...prev.document, is_active: e.target.checked } }))}
                                        className="w-5.5 h-5.5 rounded text-[#E91E63] focus:ring-[#E91E63] border-gray-200 transition-colors"
                                    />
                                    <label htmlFor="is_active_toggle" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                        {t('active')}
                                    </label>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="pt-6 border-t border-gray-50 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setModalState({ isOpen: false, document: null })}
                                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                                    disabled={saveMutation.isLoading}
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 rounded-xl bg-[#E91E63] hover:bg-[#D81B60] text-white text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
                                    disabled={saveMutation.isLoading}
                                >
                                    {saveMutation.isLoading && (
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                                        </svg>
                                    )}
                                    {t('save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 backdrop-blur-sm flex justify-center items-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">{t('delete_document')}</h3>
                        <p className="text-sm text-gray-500 mb-6">{t('delete_confirm')}</p>
                        
                        <div className="flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => deleteMutation.mutate(deleteTarget)}
                                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                                disabled={deleteMutation.isLoading}
                            >
                                {isArabic ? 'حذف' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
