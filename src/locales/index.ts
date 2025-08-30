import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入语言资源
import zhCN from './zh-CN';
import enUS from './en-US';

// 语言资源配置
const resources = {
  'zh-CN': {
    translation: zhCN,
  },
  'en-US': {
    translation: enUS,
  },
};

// 支持的语言列表
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

// 获取默认语言
const getDefaultLanguage = (): string => {
  // 优先从localStorage获取
  const savedLanguage = localStorage.getItem('wendeal-dashboard-language');
  if (
    savedLanguage &&
    supportedLanguages.some(lang => lang.key === savedLanguage)
  ) {
    return savedLanguage;
  }

  // 默认返回英文（不再检测浏览器语言）
  return 'en-US';
};

// 初始化i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: getDefaultLanguage(),
    fallbackLng: 'en-US',
    debug: process.env.NODE_ENV === 'development',

    interpolation: {
      escapeValue: false, // React已经默认转义
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

// 语言切换函数
export const changeLanguage = (language: string) => {
  i18n.changeLanguage(language);
  localStorage.setItem('wendeal-dashboard-language', language);

  // 触发自定义事件，通知其他组件语言已更改
  window.dispatchEvent(
    new CustomEvent('languageChanged', {
      detail: { language },
    })
  );
};

// 获取当前语言
export const getCurrentLanguage = () => i18n.language;

// 获取当前语言信息
export const getCurrentLanguageInfo = () => {
  const currentLang = getCurrentLanguage();
  return (
    supportedLanguages.find(lang => lang.key === currentLang) ||
    supportedLanguages[0]
  );
};

export default i18n;
