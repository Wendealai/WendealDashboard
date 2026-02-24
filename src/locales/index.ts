import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhCN from './zh-CN';
import enUS from './en-US';
import zhCNSparkeryOverrides from './zh-CN.sparkery-overrides';

const i18n = i18next;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const mergeDeep = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> => {
  const output: Record<string, unknown> = { ...target };

  Object.entries(source).forEach(([key, value]) => {
    const current = output[key];
    if (isRecord(current) && isRecord(value)) {
      output[key] = mergeDeep(current, value);
      return;
    }
    output[key] = value;
  });

  return output;
};

const zhCNTranslation = mergeDeep(
  zhCN as Record<string, unknown>,
  zhCNSparkeryOverrides as Record<string, unknown>
);

const resources = {
  'zh-CN': {
    translation: zhCNTranslation,
  },
  'en-US': {
    translation: enUS,
  },
};

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

const getDefaultLanguage = (): string => {
  const savedLanguage = localStorage.getItem('wendeal-dashboard-language');
  if (
    savedLanguage &&
    supportedLanguages.some(lang => lang.key === savedLanguage)
  ) {
    return savedLanguage;
  }

  return 'en-US';
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: getDefaultLanguage(),
    fallbackLng: 'en-US',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false,
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

export const changeLanguage = (language: string) => {
  i18n.changeLanguage(language);
  localStorage.setItem('wendeal-dashboard-language', language);

  window.dispatchEvent(
    new CustomEvent('languageChanged', {
      detail: { language },
    })
  );
};

export const getCurrentLanguage = () => i18n.language;

export const getCurrentLanguageInfo = () => {
  const currentLang = getCurrentLanguage();
  return (
    supportedLanguages.find(lang => lang.key === currentLang) ||
    supportedLanguages[0]
  );
};

export default i18n;
