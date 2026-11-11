import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend) // لقراءة الملفات من مجلد public
  .use(LanguageDetector) // لمعرفة لغة المتصفح
  .use(initReactI18next) // لربطها مع React
  .init({
    fallbackLng: 'en', // اللغة الافتراضية
    ns: ['auth','common' , 'users' , 'services' , 'employees' ,'workers' , 'categories' , 'bookings' , 'dashboard' , 'banners' , 'announcements' , 'settings' , 'locations', 'reports', 'legal_documents'], // أسماء الملفات (Namespaces) اللي عملناها
    defaultNS: 'common',
    backend: {
      // المسار الصحيح لقراءة الملفات في Vite مع منع التخزين المؤقت القديم
      loadPath: '/admin/locales/{{lng}}/{{ns}}.json',
      queryStringParams: {
        v: typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : Date.now(),
      },
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;