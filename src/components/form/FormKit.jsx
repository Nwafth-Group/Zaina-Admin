import React, { useEffect, useState } from 'react';

/**
 * Shared form controls so every admin add/edit modal matches the Services form:
 * consistent inputs, custom-chevron selects, radio-card option groups, and a
 * styled image dropzone with live preview.
 */

export const INPUT_CLASS =
    'w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:border-[#E91E63] transition-colors bg-white';
export const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1.5';

/**
 * Outline icons (Heroicons) keyed by a short name so a section can show a
 * relevant glyph without each modal importing an icon set.
 */
const SECTION_ICONS = {
    info: <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />,
    clock: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
    location: <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />,
    sparkles: <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />,
    shield: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />,
    user: <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />,
    briefcase: <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.073c0 1.313-.953 2.439-2.253 2.632a48.81 48.81 0 01-11.994 0c-1.3-.193-2.253-1.319-2.253-2.632V14.15M8.25 6.75h7.5a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25V9a2.25 2.25 0 012.25-2.25zM9 6.75V5.25A2.25 2.25 0 0111.25 3h1.5A2.25 2.25 0 0115 5.25v1.5" />,
    tag: <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z" />,
    settings: <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />,
};

/**
 * Card wrapper for one logical group of fields. Every section gets a header with
 * an icon, a title and a short description so the form is self-explanatory, plus
 * an optional trailing `action` (e.g. an "add row" button) before the fields.
 */
export function FormSection({ icon, title, description, action, children }) {
    return (
        <section className="bg-white p-5 rounded-xl border border-gray-100 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-start gap-3 min-w-0">
                    {icon && SECTION_ICONS[icon] && (
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FDF0F3] text-[#E91E63]">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                {SECTION_ICONS[icon]}
                            </svg>
                        </span>
                    )}
                    <div className="min-w-0">
                        <h4 className="font-bold text-gray-800 leading-tight">{title}</h4>
                        {description && <p className="text-xs text-gray-500 mt-1 leading-snug">{description}</p>}
                    </div>
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            {children}
        </section>
    );
}

/**
 * <select> with the native arrow removed and a custom chevron on the trailing
 * edge (logical `end-*`), so it sits correctly in both RTL and LTR. Forwards a
 * react-hook-form registration object.
 */
export function SelectField({ registration, children, className = '', disabled = false }) {
    return (
        <div className="relative">
            <select
                {...registration}
                disabled={disabled}
                className={`${INPUT_CLASS} appearance-none pe-10 ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
            >
                {children}
            </select>
            <svg className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-3 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
    );
}

/**
 * Radio cards that show every option at once (no dropdown). Each option may
 * carry a `dot` colour class. Used for status selectors.
 */
export function OptionCards({ value, onChange, options, columns = 2 }) {
    const cols = columns === 3 ? 'grid-cols-3' : columns === 1 ? 'grid-cols-1' : 'grid-cols-2';
    return (
        <div className={`grid gap-2 ${cols}`} role="radiogroup">
            {options.map((opt) => {
                const active = String(value) === String(opt.value);
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(opt.value)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${active ? 'border-[#E91E63] bg-[#FDF0F3]' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-[#E91E63]' : 'border-gray-300'}`}>
                            {active && <span className="h-2 w-2 rounded-full bg-[#E91E63]" />}
                        </span>
                        {opt.dot && <span className={`h-2 w-2 shrink-0 rounded-full ${opt.dot}`} />}
                        <span className={active ? 'text-[#E91E63]' : 'text-gray-600'}>{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Clickable image dropzone with a live preview of a freshly-picked file (and
 * the existing saved image in edit mode). Object URLs are revoked on change.
 */
export function ImageDropzone({ register, watch, name = 'image', currentImage = null, label, uploadText, changeText }) {
    const list = watch(name);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (list && list[0] instanceof File) {
            const url = URL.createObjectURL(list[0]);
            setPreview(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreview(null);
    }, [list]);

    const display = preview || currentImage;
    const id = `dropzone-${name}`;

    return (
        <div>
            {label && <label className={LABEL_CLASS}>{label}</label>}
            <label
                htmlFor={id}
                className={`relative cursor-pointer flex items-center justify-center rounded-xl border-2 overflow-hidden h-44 transition-colors ${display ? 'border-solid border-gray-200' : 'border-dashed border-gray-200 hover:border-[#E91E63] hover:bg-[#FDF0F3]/30'}`}
            >
                {display ? (
                    <>
                        <img src={display} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/45 text-white text-xs py-1 text-center">{changeText}</span>
                    </>
                ) : (
                    <span className="flex flex-col items-center gap-2 p-4 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FDF0F3] text-[#E91E63]">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                        </span>
                        <span className="text-xs font-medium text-[#E91E63]">{uploadText}</span>
                    </span>
                )}
            </label>
            <input id={id} type="file" accept="image/*" {...register(name)} className="hidden" />
        </div>
    );
}
