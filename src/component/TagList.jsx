import React, { useState } from 'react';

/**
 * Renders a list of related entities as tags inside a table cell. Shows the
 * first `max` items plus a "+N" chip for the rest. When `expandable` is true the
 * chip expands the remaining items in place (with a "−" chip to collapse again);
 * when false it's just a static count. `label(item)` returns each tag's text.
 */
export default function TagList({ items, label, max = 2, emptyText = '—', expandable = true }) {
    const [expanded, setExpanded] = useState(false);
    const list = items || [];

    if (list.length === 0) {
        return <span className="text-xs text-gray-400">{emptyText}</span>;
    }

    const showAll = expandable && expanded;
    const visible = showAll ? list : list.slice(0, max);
    const hidden = list.length - visible.length;

    return (
        <div className="flex flex-wrap items-center gap-1.5 max-w-[280px]">
            {visible.map((item) => (
                <span
                    key={item.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-pink-50 text-[#E91E63] border border-pink-100 whitespace-nowrap"
                >
                    {label(item)}
                </span>
            ))}
            {hidden > 0 && (
                expandable ? (
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                        +{hidden}
                    </button>
                ) : (
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-600">
                        +{hidden}
                    </span>
                )
            )}
            {showAll && list.length > max && (
                <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-md text-sm font-bold leading-none bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    aria-label="collapse"
                >
                    −
                </button>
            )}
        </div>
    );
}
