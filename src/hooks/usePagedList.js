import { useEffect, useState } from 'react';

/**
 * Client-side pagination for an already-fetched list (used on pages whose API
 * returns every row, e.g. Categories and Services). Returns the current page
 * slice plus Laravel-style `meta` so the shared <Pagination> component can be
 * reused exactly as on the server-paginated pages.
 *
 * @param {Array}  list      The full list to page through.
 * @param {number} perPage   Rows per page.
 * @param {*}      resetKey  When this value changes (e.g. the filter/search
 *                           query string) the active page snaps back to 1.
 */
export default function usePagedList(list = [], perPage = 10, resetKey) {
    const [page, setPage] = useState(1);

    const total = list.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));

    // Snap back to the first page whenever the upstream data set changes.
    useEffect(() => {
        setPage(1);
    }, [resetKey]);

    // Guard against the active page falling past the end after the list shrinks.
    useEffect(() => {
        if (page > lastPage) setPage(lastPage);
    }, [page, lastPage]);

    const start = (page - 1) * perPage;
    const items = list.slice(start, start + perPage);

    const meta = {
        current_page: page,
        last_page: lastPage,
        from: total === 0 ? 0 : start + 1,
        to: Math.min(start + perPage, total),
        total,
    };

    return { items, meta, setPage };
}
