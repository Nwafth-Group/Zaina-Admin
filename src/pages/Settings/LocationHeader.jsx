import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/** Back-to-Settings breadcrumb shown above each location management page. */
export default function LocationHeader({ title }) {
    const { t } = useTranslation('locations');
    return (
        <Link to="/settings" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#E91E63] mb-4 transition-colors">
            <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t('back_to_settings')}
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-gray-700 font-medium">{title}</span>
        </Link>
    );
}
