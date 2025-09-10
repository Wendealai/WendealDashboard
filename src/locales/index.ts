import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import language resources
import zhCN from './zh-CN';
import enUS from './en-US';

// Language resource configuration
const resources = {
  'zh-CN': {
    translation: zhCN,
  },
  'en-US': {
    translation: enUS,
  },
};

// Supported languages list
export const supportedLanguages = [
  {
    key: 'zh-CN',
    label: '简体中文',
    flag: '🇨🇳',
  },
  {
    key: 'en-US',
    label: 'English',
    flag: '🇺🇸',
  },
];

// Get default language
const getDefaultLanguage = (): string => {
  // Get from localStorage first
  const savedLanguage = localStorage.getItem('wendeal-dashboard-language');
  if (
    savedLanguage &&
    supportedLanguages.some(lang => lang.key === savedLanguage)
  ) {
    return savedLanguage;
  }

  // Default to English
  return 'en-US';
};

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: getDefaultLanguage(),
    fallbackLng: 'en-US',
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'wendeal-dashboard-language',
    },

    react: {
      useSuspense: false,
    },
  });

// Language switching function
export const changeLanguage = (language: string) => {
  i18n.changeLanguage(language);
  localStorage.setItem('wendeal-dashboard-language', language);

  // Trigger custom event to notify other components that language has changed
  window.dispatchEvent(
    new CustomEvent('languageChanged', {
      detail: { language },
    })
  );
};

// Get current language
export const getCurrentLanguage = () => i18n.language;

// Get current language info
export const getCurrentLanguageInfo = () => {
  const currentLang = getCurrentLanguage();
  return (
    supportedLanguages.find(lang => lang.key === currentLang) ||
    supportedLanguages[0]
  );
};

export default i18n;
