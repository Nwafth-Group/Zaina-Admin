import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import AreaActionModal from './AreaActionModal';
import LocationHeader from './LocationHeader.jsx';
import RowActionsMenu, { EditIcon, ToggleIcon, TrashIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';
import { hasPermission } from '../../utils/permissions.js';

export default function Areas() {
    const { t, i18n } = useTranslation('locations');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();
    const [modal, setModal] = useState({ open: false, area: null });
    const [page, setPage] = useState(1);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['areas', page],
        queryFn: async () => (await axiosInstance.get(`/admin/areas?page=${page}`)).data.data,
        keepPreviousData: true,
    });

    const areas = data?.items || [];
    const meta = data?.meta;
    const nameOf = (obj) => obj ? (isArabic ? obj.name_ar : obj.name_en) : '—';

    const toggle = useMutation({
        mutationFn: (id) => axiosInstance.post(`/admin/areas/${id}/toggle-status`),
        onSuccess: () => { toast.success(t('common.toggled')); queryClient.invalidateQueries({ queryKey: ['areas'] }); },
        onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => axiosInstance.delete(`/admin/areas/${id}`),
        onSuccess: () => {
            toast.success(t('common.deleted') || 'Deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['areas'] });
        },
        onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
    });

    if (isError) {
        return (
            <div>
                <LocationHeader title={t('areas.title')} />
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-red-500 font-bold">
                    {error.response?.status === 403 ? t('common.forbidden') : error.message}
                </div>
            </div>
        );
    }

    return (
        <div>
            <LocationHeader title={t('areas.title')} />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[60vh]">
                <div className="p-4 md:p-6 border-b border-gray-50 flex justify-between items-center gap-4">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-800">{t('areas.title')}</h2>
                        <p className="text-sm text-gray-500 mt-1">{t('areas.subtitle')}</p>
                    </div>
                    <button
                        onClick={() => setModal({ open: true, area: null })}
                        className="bg-[#E91E63] text-white px-5 py-2 rounded-full font-medium hover:bg-[#D81B60] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        {t('areas.add')}
                    </button>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">{t('common.name')}</th>
                                <th className="px-6 py-4">{t('common.code')}</th>
                                <th className="px-6 py-4">{t('areas.col_city')}</th>
                                <th className="px-6 py-4">{t('areas.col_country')}</th>
                                <th className="px-6 py-4 text-center">{t('common.status')}</th>
                                <th className="px-6 py-4 text-center">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500">{t('common.loading')}</td></tr>
                            ) : areas.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500">{t('common.no_data')}</td></tr>
                            ) : (
                                areas.map((a) => (
                                    <tr key={a.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{nameOf(a)}</td>
                                        <td className="px-6 py-4" dir="ltr">{a.code}</td>
                                        <td className="px-6 py-4">{nameOf(a.city)}</td>
                                        <td className="px-6 py-4">{nameOf(a.city?.country)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {a.status === 'active' ? t('common.active') : t('common.inactive')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <RowActionsMenu
                                                label={t('common.actions')}
                                                items={[
                                                    { key: 'edit', label: t('common.edit'), icon: <EditIcon />, onClick: () => setModal({ open: true, area: a }) },
                                                    { key: 'toggle', label: t('common.toggle_status'), icon: <ToggleIcon />, onClick: () => toggle.mutate(a.id), disabled: toggle.isPending },
                                                    {
                                                        key: 'delete',
                                                        label: isArabic ? 'حذف' : 'Delete',
                                                        icon: <TrashIcon />,
                                                        danger: true,
                                                        onClick: () => {
                                                            if (window.confirm(isArabic ? 'هل أنت متأكد من رغبتك في حذف هذه المنطقة؟' : 'Are you sure you want to delete this area?')) {
                                                                deleteMutation.mutate(a.id);
                                                            }
                                                        },
                                                        disabled: deleteMutation.isPending,
                                                    },
                                                ]}
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination meta={meta} onPageChange={setPage} />
            </div>

            {modal.open && <AreaActionModal areaToEdit={modal.area} onClose={() => setModal({ open: false, area: null })} />}
        </div>
    );
}
