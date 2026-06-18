import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';

import BannerActionModal from './BannerActionModal';
import RowActionsMenu, { EditIcon, ToggleIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';

export default function Banners() {
    const { t } = useTranslation('banners');
    const queryClient = useQueryClient();

    const [actionModal, setActionModal] = useState({ isOpen: false, bannerToEdit: null });
    const [currentPage, setCurrentPage] = useState(1);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['banners', currentPage],
        queryFn: async () => (await axiosInstance.get(`/admin/ads?page=${currentPage}`)).data.data,
        keepPreviousData: true,
    });

    const banners = data?.items || [];
    const meta = data?.meta;

    const toggleStatusMutation = useMutation({
        mutationFn: (id) => axiosInstance.patch(`/admin/ads/${id}/toggle-status`),
        onSuccess: (response) => {
            toast.success(response.data?.message || t('toggled'));
            queryClient.invalidateQueries({ queryKey: ['banners'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || t('error'));
        },
    });

    if (isError) return <div className="p-8 text-red-500 font-bold">{error.message}</div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col min-h-[70vh]">

            <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('title')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
                </div>

                <button
                    onClick={() => setActionModal({ isOpen: true, bannerToEdit: null })}
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
                ) : banners.length === 0 ? (
                    <div className="py-16 text-center text-gray-500">{t('no_data')}</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {banners.map((banner) => (
                            <div key={banner.id} className="group rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden flex flex-col">
                                <div className="relative aspect-[16/9] bg-gray-100">
                                    {banner.image ? (
                                        <img src={banner.image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    )}
                                    <span className={`absolute top-2 end-2 px-2.5 py-1 rounded-full text-xs font-bold ${banner.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                        {banner.status === 'active' ? t('status.active') : t('status.inactive')}
                                    </span>
                                </div>

                                <div className="p-3 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        {banner.link ? (
                                            <a href={banner.link} target="_blank" rel="noreferrer" dir="ltr" className="text-xs text-[#E91E63] hover:underline truncate block" title={banner.link}>
                                                {banner.link}
                                            </a>
                                        ) : (
                                            <span className="text-xs text-gray-400">{t('no_link')}</span>
                                        )}
                                    </div>
                                    <RowActionsMenu
                                        label={t('actions.title')}
                                        items={[
                                            {
                                                key: 'edit',
                                                label: t('actions.edit'),
                                                icon: <EditIcon />,
                                                onClick: () => setActionModal({ isOpen: true, bannerToEdit: banner }),
                                            },
                                            {
                                                key: 'toggle',
                                                label: t('actions.toggle_status'),
                                                icon: <ToggleIcon />,
                                                onClick: () => toggleStatusMutation.mutate(banner.id),
                                                disabled: toggleStatusMutation.isPending,
                                            },
                                        ]}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Pagination meta={meta} onPageChange={setCurrentPage} />

            {actionModal.isOpen && (
                <BannerActionModal
                    bannerToEdit={actionModal.bannerToEdit}
                    onClose={() => setActionModal({ isOpen: false, bannerToEdit: null })}
                />
            )}
        </div>
    );
}
