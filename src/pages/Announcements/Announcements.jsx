import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import RowActionsMenu, { EyeIcon, EditIcon, TrashIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';

export default function Announcements() {
    const { t, i18n } = useTranslation('announcements');
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isArabic = i18n.language?.startsWith('ar');

    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

    const lastCountsRef = useRef({ all: 0, total_recipients: 0 });

    const { data: responseData, isLoading, isError, error } = useQuery({
        queryKey: ['announcements', currentPage],
        queryFn: async () => (await axiosInstance.get(`/admin/announcements?page=${currentPage}`)).data.data,
        keepPreviousData: true,
    });

    const announcements = responseData?.items || [];
    const meta = responseData?.meta;

    if (responseData?.counts) {
        lastCountsRef.current = responseData.counts;
    }
    const counts = lastCountsRef.current;

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
        <div className="space-y-6 font-main w-full">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        {isArabic ? 'إدارة الإعلانات والتنبيهات' : 'Announcements & Notifications'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isArabic ? 'إنشاء وإرسال الإعلانات العامة والتنبيهات للمستخدمين.' : 'Create and broadcast app announcement notifications to clients.'}
                    </p>
                </div>

                <button
                    onClick={() => navigate('/announcements/create')}
                    className="bg-[#E91E63] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#D81B60] transition shadow-2xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto outline-none"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>{t('add_new')}</span>
                </button>
            </div>

            {/* Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-gray-200 bg-white text-gray-700 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-bold text-gray-500">{isArabic ? 'إجمالي الإعلانات' : 'Total Announcements'}</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{counts.all ?? 0}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-pink-50 text-[#E91E63] flex items-center justify-center text-xl">📢</div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white text-gray-700 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-bold text-gray-500">{isArabic ? 'إجمالي المستلمين' : 'Total Recipients'}</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{counts.total_recipients ?? 0}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xl">👥</div>
                </div>
            </div>

            {/* View Mode Toggle & Container Header */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">
                    {isArabic ? 'قائمة الإعلانات' : 'Announcements List'}
                </span>

                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition ${viewMode === 'grid' ? 'bg-white text-[#E91E63] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {isArabic ? 'شبكي' : 'Grid'}
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition ${viewMode === 'table' ? 'bg-white text-[#E91E63] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {isArabic ? 'جدول' : 'Table'}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="flex justify-center items-center gap-2 py-16 text-gray-500 font-bold text-xs bg-white rounded-2xl border border-gray-200">
                    <svg className="animate-spin h-5 w-5 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                    <span>{t('loading')}</span>
                </div>
            ) : announcements.length === 0 ? (
                <div className="py-16 text-center text-gray-400 font-bold text-xs bg-white rounded-2xl border border-gray-200">
                    {t('no_data')}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {announcements.map((announcement) => (
                        <div key={announcement.id} onClick={() => navigate(`/announcements/${announcement.id}`)} className="group rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col p-4 transition hover:border-pink-200 hover:shadow-md cursor-pointer">
                            <div className="flex items-start justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                                <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 min-w-0">
                                    {announcement.title}
                                </h3>
                                <RowActionsMenu
                                    label={t('actions.title')}
                                    items={[
                                        {
                                            key: 'details',
                                            label: isArabic ? 'التفاصيل' : 'View Details',
                                            icon: <EyeIcon />,
                                            onClick: () => navigate(`/announcements/${announcement.id}`),
                                        },
                                        {
                                            key: 'edit',
                                            label: t('actions.edit'),
                                            icon: <EditIcon />,
                                            onClick: () => navigate(`/announcements/${announcement.id}/edit`),
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

                            <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDF0F3] text-[#E91E63] px-2.5 py-1 text-[11px] font-bold">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />
                                    </svg>
                                    {t('card.recipients', { num: announcement.readers_count ?? 0 })}
                                </span>
                                {announcement.created_at && (
                                    <span className="text-[11px] text-gray-400 font-medium">{formatDate(announcement.created_at)}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">
                                    <th className="py-3.5 px-4 text-center">{isArabic ? 'العنوان' : 'Title'}</th>
                                    <th className="py-3.5 px-4 text-center">{isArabic ? 'نص الإعلان' : 'Body'}</th>
                                    <th className="py-3.5 px-4 text-center">{isArabic ? 'المستلمين' : 'Recipients'}</th>
                                    <th className="py-3.5 px-4 text-center">{isArabic ? 'التاريخ' : 'Date'}</th>
                                    <th className="py-3.5 px-4 text-center">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {announcements.map((announcement) => (
                                    <tr key={announcement.id} onClick={() => navigate(`/announcements/${announcement.id}`)} className="hover:bg-gray-50/80 transition cursor-pointer">
                                        <td className="py-3 px-4 text-start font-bold text-gray-900 max-w-[200px] truncate">
                                            {announcement.title}
                                        </td>
                                        <td className="py-3 px-4 text-start text-gray-600 max-w-[300px] truncate">
                                            {announcement.body}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-pink-50 text-[#E91E63]">
                                                {announcement.readers_count ?? 0} {isArabic ? 'مستلم' : 'recipients'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center text-gray-500 font-medium">
                                            {formatDate(announcement.created_at)}
                                        </td>
                                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-center">
                                                <RowActionsMenu
                                                    label={t('actions.title')}
                                                    items={[
                                                        {
                                                            key: 'details',
                                                            label: isArabic ? 'التفاصيل' : 'View Details',
                                                            icon: <EyeIcon />,
                                                            onClick: () => navigate(`/announcements/${announcement.id}`),
                                                        },
                                                        {
                                                            key: 'edit',
                                                            label: t('actions.edit'),
                                                            icon: <EditIcon />,
                                                            onClick: () => navigate(`/announcements/${announcement.id}/edit`),
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
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <Pagination meta={meta} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
}
