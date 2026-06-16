import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Build a compact, windowed list of page numbers with ellipses, e.g.
 *   1 … 4 5 6 … 20
 * Always keeps the first and last page, plus `window` neighbours of the current.
 */
function buildPages(current, last, window = 1) {
    const pages = [];
    const left = Math.max(2, current - window);
    const right = Math.min(last - 1, current + window);

    pages.push(1);
    if (left > 2) pages.push('start-ellipsis');
    for (let p = left; p <= right; p++) pages.push(p);
    if (right < last - 1) pages.push('end-ellipsis');
    if (last > 1) pages.push(last);

    return pages;
}

/**
 * Unified pagination bar shared by every paginated admin list.
 * Renders a "showing X–Y of Z" summary, prev/next arrows and numbered page
 * buttons (with ellipses for large ranges). Hidden when there is a single page.
 *
 * @param {object}   meta          Laravel paginator meta { current_page, last_page, from, to, total }
 * @param {Function} onPageChange  Called with the target absolute page number
 */
export default function Pagination({ meta, onPageChange, className = '' }) {
    const { t } = useTranslation('common');

    if (!meta || (meta.last_page ?? 1) <= 1) return null;

    const current = meta.current_page;
    const last = meta.last_page;
    const pages = buildPages(current, last);

    const numberBtn = (active) =>
        `min-w-[36px] h-9 px-2.5 inline-flex items-center justify-center rounded-lg text-sm font-medium border transition-colors ${
            active
                ? 'bg-[#E91E63] text-white border-[#E91E63] shadow-sm'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
        }`;

    const arrowBtn =
        'w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

    return (
        <div className={`p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 mt-auto ${className}`}>
            <span className="text-sm text-gray-500">
                {t('pagination.showing', {
                    from: meta.from ?? 0,
                    to: meta.to ?? 0,
                    total: meta.total ?? 0,
                    defaultValue: 'Showing {{from}}–{{to}} of {{total}}',
                })}
            </span>

            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onPageChange(current - 1)}
                    disabled={current <= 1}
                    className={arrowBtn}
                    aria-label={t('pagination.previous', { defaultValue: 'Previous' })}
                >
                    <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                {pages.map((p) =>
                    typeof p === 'string' ? (
                        <span key={p} className="px-1.5 text-gray-400 select-none">…</span>
                    ) : (
                        <button key={p} type="button" onClick={() => onPageChange(p)} className={numberBtn(p === current)}>
                            {p}
                        </button>
                    )
                )}

                <button
                    type="button"
                    onClick={() => onPageChange(current + 1)}
                    disabled={current >= last}
                    className={arrowBtn}
                    aria-label={t('pagination.next', { defaultValue: 'Next' })}
                >
                    <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
