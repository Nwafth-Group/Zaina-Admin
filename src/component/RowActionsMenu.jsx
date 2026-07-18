import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const MENU_WIDTH = 200; // slightly wider for better spacing

/**
 * A premium, beautiful three-dots (kebab) row-actions dropdown.
 *
 * Rendered through a portal with fixed positioning so it is never clipped by a
 * table's `overflow-x-auto` wrapper. Pass an array of action items:
 *   { key, label, icon?, onClick, danger?, disabled?, hidden? }
 * Falsy items and `hidden` items are skipped.
 */
export default function RowActionsMenu({ items = [], label = 'Actions' }) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const btnRef = useRef(null);

    const visible = items.filter(Boolean).filter((it) => !it.hidden);

    const place = useCallback(() => {
        const el = btnRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        // Align the menu's end edge under the trigger, clamped to the viewport.
        const left = Math.min(Math.max(r.right - MENU_WIDTH, 8), window.innerWidth - MENU_WIDTH - 8);
        
        // Estimate the menu height: each item is ~42px plus 12px padding
        const estimatedHeight = visible.length * 42 + 12;
        const spaceBelow = window.innerHeight - r.bottom;
        const showAbove = spaceBelow < estimatedHeight && r.top > estimatedHeight;
        
        const top = showAbove ? r.top - estimatedHeight - 6 : r.bottom + 6;
        setCoords({ top, left });
    }, [visible.length]);

    const toggle = (e) => {
        e.stopPropagation();
        if (!open) place();
        setOpen((o) => !o);
    };

    // Any scroll/resize invalidates the fixed position — simplest correct fix is to close.
    useLayoutEffect(() => {
        if (!open) return undefined;
        const close = () => setOpen(false);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [open]);

    if (visible.length === 0) return null;

    return (
        <div className="inline-block" onClick={(e) => e.stopPropagation()}>
            <button
                ref={btnRef}
                onClick={toggle}
                className={`p-2 rounded-xl transition-all duration-200 outline-none ${
                    open 
                        ? 'bg-pink-50 text-[#E91E63] scale-95 shadow-inner' 
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 active:scale-95'
                }`}
                aria-label={label}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
            </button>

            {open && createPortal(
                <>
                    <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
                    <div
                        style={{ 
                            top: coords.top, 
                            left: coords.left, 
                            width: MENU_WIDTH,
                            transformOrigin: 'top right',
                        }}
                        className="fixed z-[101] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-1.5 animate-in fade-in zoom-in-95 duration-100 transition-all"
                    >
                        {visible.map((it) => (
                            <button
                                key={it.key}
                                disabled={it.disabled}
                                onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick?.(); }}
                                className={`w-full text-start px-3.5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-3 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                                    it.danger 
                                        ? 'text-red-500 hover:bg-red-50 hover:text-red-700 hover:translate-x-0.5 rtl:hover:-translate-x-0.5' 
                                        : 'text-gray-500 hover:bg-pink-50/50 hover:text-[#E91E63] hover:translate-x-0.5 rtl:hover:-translate-x-0.5'
                                }`}
                            >
                                {it.icon && (
                                    <span className={`shrink-0 transition-transform group-hover:scale-110 ${
                                        it.danger ? 'text-red-500' : 'text-gray-400 group-hover:text-[#E91E63]'
                                    }`}>{it.icon}</span>
                                )}
                                <span className="truncate">{it.label}</span>
                            </button>
                        ))}
                    </div>
                </>,
                document.body,
            )}
        </div>
    );
}

/* ── Shared menu icons (w-4 h-4, currentColor) ───────────────────────────── */

const Icon = ({ d }) => (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
);

export const EditIcon = () => <Icon d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />;
export const ToggleIcon = () => <Icon d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />;
export const KeyIcon = () => <Icon d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />;
export const ReviewIcon = () => <Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />;
export const EyeIcon = () => <Icon d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />;
export const CancelIcon = () => <Icon d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
export const TrashIcon = () => <Icon d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />;
