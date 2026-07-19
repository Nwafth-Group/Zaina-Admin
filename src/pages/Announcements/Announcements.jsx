import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import AnnouncementActionModal from './AnnouncementActionModal';
import RowActionsMenu, { EditIcon, TrashIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';

export default function Announcements() {
    const { t, i18n } = useTranslation('announcements');
    const queryClient = useQueryClient();
    const isArabic = i18n.language?.startsWith('ar');

    const [actionModal, setActionModal] = useState({ isOpen: false, announcementToEdit: null });
    const [currentPage, setCurrentPage] = useState(1);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['announcements', currentPage],
        queryFn: async () => (await axiosInstance.get(`/admin/announcements?page=${currentPage}`)).data.data,
        keepPreviousData: true,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            return axiosInstance.delete(`/admin/announcements/${id}`);
        },
        onSuccess: (response) => {
            toast.success(response.data?.message || (isArabic ? 'تم حذف الإعلان بنجاح' : 'Announcement deleted successfully'));
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || (isArabic ? 'حدث خطأ أثناء حذف الإعلان.' : 'Error deleting announcement.'));
        },
    });

    const handleDelete = (id) => {
        if (window.confirm(isArabic ? 'هل أنت متأكد من حذف هذا الإعلان؟' : 'Are you sure you want to delete this announcement?')) {
            deleteMutation.mutate(id);
        }
    };

    const announcements = data?.items || [];
    const meta = data?.meta;

    const formatDate = (value) => {
        if (!value) return '';
        try {
            return new Date(value.replace(' ', 'T')).toLocaleDateString(i18n.language, {
                year: 'numeric', month: 'short', day: 'numeric',
            });
        } catch {
            return value;
        }
    };

    if (isError) return <div className="p-8 text-red-500 font-bold">{error.message}</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col min-h-[70vh]">

            <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('title')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
                </div>

                <button
                    onClick={() => setActionModal({ isOpen: true, announcementToEdit: null })}
                    className="bg-[#E91E63] text-white px-5 py-2 rounded-full font-medium hover:bg-[#D81B60] transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {t('add_new')}
                </button>
            </div>

            <div className="flex-1 p-4 md:p-6">
                {isLoading ? (
                    <div className="flex justify-center items-center gap-3 py-16 text-gray-500">
                        <svg className="animate-spin h-6 w-6 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                        <span className="text-lg font-medium">{t('loading')}</span>
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="py-16 text-center text-gray-500">{t('no_data')}</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {announcements.map((announcement) => (
                            <div key={announcement.id} className="group rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden flex flex-col p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2 min-w-0">
                                        {announcement.title}
                                    </h3>
                                    <RowActionsMenu
                                        label={t('actions.title')}
                                        items={[
                                            {
                                                key: 'edit',
                                                label: t('actions.edit'),
                                                icon: <EditIcon />,
                                                onClick: () => setActionModal({ isOpen: true, announcementToEdit: announcement }),
                                            },
                                            {
                                                key: 'delete',
                                                label: t('actions.delete') || (isArabic ? 'حذف' : 'Delete'),
                                                icon: <TrashIcon />,
                                                onClick: () => handleDelete(announcement.id),
                                                danger: true,
                                            },
                                        ]}
                                    />
                                </div>

                                <p className="text-xs text-gray-500 mt-2 line-clamp-4 flex-1">
                                    {announcement.body}
                                </p>

                                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-50">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDF0F3] text-[#E91E63] px-2.5 py-1 text-[11px] font-bold">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />
                                        </svg>
                                        {t('card.recipients', { num: announcement.readers_count ?? 0 })}
                                    </span>
                                    {announcement.created_at && (
                                        <span className="text-[11px] text-gray-400">{formatDate(announcement.created_at)}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Pagination meta={meta} onPageChange={setCurrentPage} />

            {actionModal.isOpen && (
                <AnnouncementActionModal
                    announcementToEdit={actionModal.announcementToEdit}
                    onClose={() => setActionModal({ isOpen: false, announcementToEdit: null })}
                />
            )}
        </div>
    );
}
