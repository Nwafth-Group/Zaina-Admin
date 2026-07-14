import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '../../utils/permissions.js';

const CARDS = [
    {
        key: 'countries',
        to: '/settings/countries',
        icon: (
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M3.6 9h16.8 M3.6 15h16.8 M12 3a15 15 0 010 18 M12 3a15 15 0 000 18" />
        ),
    },
    {
        key: 'cities',
        to: '/settings/cities',
        icon: (
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18 M5 21V7l7-4 7 4v14 M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
        ),
    },
    {
        key: 'areas',
        to: '/settings/areas',
        icon: (
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-500 font-medium">
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
                        className="group w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 hover:bg-[#FDF0F3] hover:border-[#E91E63] transition-colors text-center p-2"
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
