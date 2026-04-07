import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  // تأثير جانبي لتغيير اتجاه الصفحة (RTL/LTR)
  useEffect(() => {
    // حماية: إذا لم يتعرف على اللغة، اعتبرها عربي
    const currentLang = i18n.language || 'en'; 
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [i18n.language]);

  const toggleLanguage = () => {
    const newLang = (i18n.language || 'en') === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-[#F4A9BC] text-[#E91E63] font-bold hover:bg-[#FDF0F3] transition-all duration-300"
    >
      <span className="text-sm">
        {(i18n.language || 'ar') === 'ar' ? 'English' : 'العربية'}
      </span>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9m0 18c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 18 0" />
      </svg>
    </button>
  );
};

export default LanguageSwitcher;