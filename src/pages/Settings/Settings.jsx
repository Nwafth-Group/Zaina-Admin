import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '../../utils/permissions.js';

const CARDS = [
    {
        key: 'service_zones',
        to: '/service-zones',
        icon: (
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503-11.488l4.875 2.437c.381.19.622.58.622 1.006v9.458c0 .812-.86 1.33-1.593.963L15 14.25M9 6.75L3.486 9.507C3.105 9.697 2.864 10.087 2.864 10.513v9.458c0 .812.86 1.33 1.593.963L9 18.75m0-12l6 3m-6 3l6 3" />
        ),
    },
    {
        key: 'company_info',
        to: '/settings/company-info',
        icon: (
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
        ),
    },
];

export default function Settings() {
    const { t } = useTranslation('settings');

    if (!hasPermission('location.edit')) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10  text-gray-500 font-medium">
                {t('forbidden')}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">{t('title')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>

            <div className="mt-6 flex flex-wrap gap-3">
                {CARDS.map((card) => (
                    <Link
                        key={card.key}
                        to={card.to}
                        className="group w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 hover:bg-[#FDF0F3] hover:border-[#E91E63] transition-colors  p-2"
                    >
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#E91E63] shadow-sm group-hover:scale-105 transition-transform">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                                {card.icon}
                            </svg>
                        </span>
                        <span className="text-xs font-bold text-gray-700 group-hover:text-[#E91E63]">{t(`cards.${card.key}`)}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
