import React from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith('ar');

  const errorMessage = error?.statusText || error?.message || (isArabic ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
          ⚠️
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {isArabic ? 'عذراً، حدث خطأ غير متوقع' : 'Oops, something went wrong'}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {isArabic ? 'نعتذر عن هذا الخطأ. يمكنك إعادة المحاولة أو العودة للرئيسية.' : 'We encountered an unexpected error. You can try reloading or return to the dashboard.'}
        </p>
        {import.meta.env.DEV && (
          <div className="bg-gray-100 rounded-lg p-3 text-xs font-mono text-gray-700 text-left mb-6 overflow-x-auto max-h-32">
            {errorMessage}
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-[#E91E63] text-white rounded-xl text-sm font-semibold hover:bg-[#d81557] transition shadow-md"
          >
            {isArabic ? 'إعادة المحاولة' : 'Try Again'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition"
          >
            {isArabic ? 'الرئيسية' : 'Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}

