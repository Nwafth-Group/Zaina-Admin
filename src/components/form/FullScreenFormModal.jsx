import React from 'react';

/**
 * Full-screen add/edit modal shell shared across the admin pages (matches the
 * Services modal): sticky header with a close button, a scrollable body whose
 * form is a centered 50%-width column, and a sticky footer whose buttons pin to
 * that column's edges — cancel on the left border, save on the right.
 *
 * The parent owns the form state and passes its fields as `children`, the
 * react-hook-form-wrapped `onSubmit`, and a unique `formId` (the footer's submit
 * button targets the form via the `form` attribute).
 */
export default function FullScreenFormModal({
    title,
    onClose,
    formId,
    onSubmit,
    isLoading = false,
    isSubmitting = false,
    submitDisabled = false,
    cancelLabel = 'Cancel',
    submitLabel = 'Save',
    children,
}) {
    return (
        <div className="fixed inset-0 z-50 bg-[#F8F9FA] flex flex-col font-main">

            {/* Sticky header */}
            <div className="flex-shrink-0 flex justify-between items-center px-6 py-4 bg-white border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors" aria-label={cancelLabel}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Scrollable body — form is a single centered column at 50% width */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <svg className="animate-spin h-8 w-8 text-[#E91E63]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                    </div>
                ) : (
                    <form id={formId} onSubmit={onSubmit} className="w-full md:w-1/2 mx-auto px-4 py-6 space-y-6">
                        {children}
                    </form>
                )}
            </div>

            {/* Sticky footer — cancel on the left border, save on the right */}
            <div className="flex-shrink-0 py-4 border-t border-gray-100 bg-white">
                <div dir="ltr" className="w-full md:w-1/2 mx-auto px-4 flex items-center justify-between gap-3">
                    <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">{cancelLabel}</button>
                    <button type="submit" form={formId} disabled={isSubmitting || submitDisabled} className="px-6 py-2.5 rounded-xl font-medium text-white bg-[#E91E63] hover:bg-[#D81B60] transition-colors disabled:opacity-70 min-w-[140px] flex justify-center items-center">
                        {isSubmitting ? '...' : submitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
