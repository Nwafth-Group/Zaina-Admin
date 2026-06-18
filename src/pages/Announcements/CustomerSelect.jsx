import React, { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

/**
 * Customer recipient picker for announcements. Lists customers 10 at a time and
 * loads the next page automatically when the user scrolls to the end (infinite
 * scroll), supports free-text search, "select all customers", and per-row
 * selection. The live selected count is shown in the outer section header.
 *
 * Selection state is owned by the parent:
 *  - selectedIds / onChange  → the explicit subset of customer IDs
 *  - sendToAll / onSendToAllChange → broadcast to every customer
 */
export default function CustomerSelect({ selectedIds, onChange, sendToAll, onSendToAllChange }) {
    const { t } = useTranslation('announcements');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const id = setTimeout(() => setSearch(searchInput.trim()), 400);
        return () => clearTimeout(id);
    }, [searchInput]);

    const {
        data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading,
    } = useInfiniteQuery({
        queryKey: ['customer-picker', search],
        queryFn: async ({ pageParam = 1 }) => {
            const params = new URLSearchParams({ type: 'customer', per_page: '10', page: String(pageParam) });
            if (search) params.append('search', search);
            return (await axiosInstance.get(`/admin/users?${params.toString()}`)).data.data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            const m = lastPage?.meta || {};
            return m.current_page < m.last_page ? m.current_page + 1 : undefined;
        },
    });

    const customers = data?.pages.flatMap((p) => p.items || []) ?? [];
    const selectedSet = new Set((selectedIds || []).map(Number));

    // Auto-load the next page when the bottom sentinel scrolls into view.
    const scrollRef = useRef(null);
    const sentinelRef = useRef(null);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || sendToAll) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { root: scrollRef.current, rootMargin: '80px', threshold: 0 },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, sendToAll, fetchNextPage, customers.length]);

    const toggleOne = (id) => {
        const n = Number(id);
        const next = new Set(selectedSet);
        next.has(n) ? next.delete(n) : next.add(n);
        onChange([...next]);
    };

    const toggleAll = () => {
        if (sendToAll) {
            onSendToAllChange(false);
        } else {
            onSendToAllChange(true);
            onChange([]);
        }
    };

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Header: search */}
            <div className="p-3 bg-gray-50 border-b border-gray-100">
                <div className="relative">
                    <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400 pointer-events-none">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={t('picker.search_placeholder')}
                        className="w-full ps-9 pe-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-[#E91E63] bg-white"
                    />
                </div>
            </div>

            {/* Select all toggle */}
            <label className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 cursor-pointer bg-white hover:bg-gray-50">
                <input
                    type="checkbox"
                    checked={sendToAll}
                    onChange={toggleAll}
                    className="w-4 h-4 text-[#E91E63] rounded focus:ring-[#E91E63]"
                />
                <span className="text-sm font-medium text-gray-700">{t('picker.select_all')}</span>
            </label>

            {/* List */}
            <div ref={scrollRef} className="max-h-64 overflow-y-auto bg-white">
                {isLoading ? (
                    <div className="p-6 text-center text-sm text-gray-500">{t('picker.loading')}</div>
                ) : customers.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">{t('picker.no_customers')}</div>
                ) : (
                    <ul className="divide-y divide-gray-50">
                        {customers.map((c) => {
                            const checked = sendToAll || selectedSet.has(Number(c.id));
                            return (
                                <li key={c.id}>
                                    <label className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${sendToAll ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#FDF0F3]'}`}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={sendToAll}
                                            onChange={() => toggleOne(c.id)}
                                            className="w-4 h-4 text-[#E91E63] rounded focus:ring-[#E91E63]"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-medium text-gray-800 truncate">{c.full_name || '-'}</span>
                                            <span className="block text-xs text-gray-400 truncate" dir="ltr">{c.email || c.mobile_number || ''}</span>
                                        </span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Sentinel: when it scrolls into view, the next page loads automatically. */}
                {hasNextPage && !sendToAll && (
                    <div ref={sentinelRef} className="p-3 text-center text-xs text-gray-400">
                        {isFetchingNextPage ? t('picker.loading') : ''}
                    </div>
                )}
            </div>
        </div>
    );
}
