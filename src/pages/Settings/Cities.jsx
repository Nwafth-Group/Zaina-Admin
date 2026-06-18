import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axios.js';
import CityActionModal from './CityActionModal';
import LocationHeader from './LocationHeader.jsx';
import RowActionsMenu, { EditIcon, ToggleIcon } from '../../component/RowActionsMenu.jsx';
import Pagination from '../../component/Pagination.jsx';
import usePagedList from '../../hooks/usePagedList.js';

export default function Cities() {
    const { t, i18n } = useTranslation('locations');
    const isArabic = i18n.language?.startsWith('ar');
    const queryClient = useQueryClient();
    const [modal, setModal] = useState({ open: false, city: null });

    const { data: cities = [], isLoading, isError, error } = useQuery({
        queryKey: ['cities'],
        queryFn: async () => (await axiosInstance.get('/admin/cities')).data.data.items || [],
        keepPreviousData: true,
    });

    const { items, meta, setPage } = usePagedList(cities, 10);
    const nameOf = (obj) => obj ? (isArabic ? obj.name_ar : obj.name_en) : '—';

    const toggle = useMutation({
        mutationFn: (id) => axiosInstance.post(`/admin/cities/${id}/toggle-status`),
        onSuccess: () => { toast.success(t('common.toggled')); queryClient.invalidateQueries({ queryKey: ['cities'] }); },
        onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
    });

    if (isError) {
        return (
            <div>
                <LocationHeader title={t('cities.title')} />
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-red-500 font-bold">
                    {error.response?.status === 403 ? t('common.forbidden') : error.message}
                </div>
            </div>
        );
    }

    return (
        <div>
            <LocationHeader title={t('cities.title')} />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[60vh]">
                <div className="p-4 md:p-6 border-b border-gray-50 flex justify-between items-center gap-4">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-800">{t('cities.title')}</h2>
                        <p className="text-sm text-gray-500 mt-1">{t('cities.subtitle')}</p>
                    </div>
                    <button
                        onClick={() => setModal({ open: true, city: null })}
                        className="bg-[#E91E63] text-white px-5 py-2 rounded-full font-medium hover:bg-[#D81B60] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        {t('cities.add')}
                    </button>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">{t('common.name')}</th>
                                <th className="px-6 py-4">{t('common.code')}</th>
                                <th className="px-6 py-4">{t('cities.col_governorate')}</th>
                                <th className="px-6 py-4">{t('cities.col_country')}</th>
                                <th className="px-6 py-4 text-center">{t('common.status')}</th>
                                <th className="px-6 py-4 text-center">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500">{t('common.loading')}</td></tr>
                            ) : cities.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500">{t('common.no_data')}</td></tr>
                            ) : (
                                items.map((c) => (
                                    <tr key={c.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{nameOf(c)}</td>
                                        <td className="px-6 py-4" dir="ltr">{c.code}</td>
                                        <td className="px-6 py-4">{nameOf(c.govrenrate)}</td>
                                        <td className="px-6 py-4">{nameOf(c.country)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {c.status === 'active' ? t('common.active') : t('common.inactive')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <RowActionsMenu
                                                label={t('common.actions')}
                                                items={[
                                                    { key: 'edit', label: t('common.edit'), icon: <EditIcon />, onClick: () => setModal({ open: true, city: c }) },
                                                    { key: 'toggle', label: t('common.toggle_status'), icon: <ToggleIcon />, onClick: () => toggle.mutate(c.id), disabled: toggle.isPending },
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

            {modal.open && <CityActionModal cityToEdit={modal.city} onClose={() => setModal({ open: false, city: null })} />}
        </div>
    );
}
