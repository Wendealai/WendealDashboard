import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enUS from './en-US';

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

const FALLBACK_LANGUAGE = 'en-US';
const CHINESE_LANGUAGE = 'zh-CN';

const resources = {
  [CHINESE_LANGUAGE]: {
    translation: {},
  },
  [FALLBACK_LANGUAGE]: {
    translation: enUS,
  },
};

const loadedLanguageBundles = new Set<string>([FALLBACK_LANGUAGE]);
const sparkeryOverridesLoaded = new Set<string>();

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

  return FALLBACK_LANGUAGE;
};

const defaultLanguage = getDefaultLanguage();

const resolveLanguageKey = (language: string): string | null => {
  if (language.startsWith('zh')) {
    return CHINESE_LANGUAGE;
  }
  if (language.startsWith('en')) {
    return FALLBACK_LANGUAGE;
  }
  return supportedLanguages.some(lang => lang.key === language)
    ? language
    : null;
};

const resolveSparkeryOverrideLanguage = (language: string): string | null => {
  if (language.startsWith('zh')) {
    return CHINESE_LANGUAGE;
  }
  if (language.startsWith('en')) {
    return FALLBACK_LANGUAGE;
  }
  return null;
};

export const loadLanguageBundle = async (
  language: string = i18n.language
): Promise<void> => {
  const languageKey = resolveLanguageKey(language);
  if (!languageKey || loadedLanguageBundles.has(languageKey)) {
    return;
  }

  let bundle: Record<string, unknown> | null = null;
  if (languageKey === CHINESE_LANGUAGE) {
    const module = await import('./zh-CN');
    bundle = module.default as Record<string, unknown>;
  }

  if (!bundle) {
    return;
  }

  const currentTranslation = (i18n.getResourceBundle(
    languageKey,
    'translation'
  ) || {}) as Record<string, unknown>;
  const mergedTranslation = mergeDeep(currentTranslation, bundle);

  i18n.addResourceBundle(
    languageKey,
    'translation',
    mergedTranslation,
    true,
    true
  );
  loadedLanguageBundles.add(languageKey);
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: FALLBACK_LANGUAGE,
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

export const loadSparkeryLocaleOverrides = async (
  language: string = i18n.language
): Promise<void> => {
  const sparkeryLanguage = resolveSparkeryOverrideLanguage(language);
  if (!sparkeryLanguage) {
    return;
  }
  await loadLanguageBundle(sparkeryLanguage);
  if (sparkeryOverridesLoaded.has(sparkeryLanguage)) {
    return;
  }

  const module =
    sparkeryLanguage === CHINESE_LANGUAGE
      ? await import('./zh-CN.sparkery-overrides')
      : await import('./en-US.sparkery-overrides');
  const overrides = module.default as Record<string, unknown>;
  const currentTranslation = (i18n.getResourceBundle(
    sparkeryLanguage,
    'translation'
  ) || {}) as Record<string, unknown>;
  const mergedTranslation = mergeDeep(currentTranslation, overrides);

  i18n.addResourceBundle(
    sparkeryLanguage,
    'translation',
    mergedTranslation,
    true,
    true
  );
  sparkeryOverridesLoaded.add(sparkeryLanguage);
};

if (defaultLanguage.startsWith('zh')) {
  void (async () => {
    await loadLanguageBundle(defaultLanguage);
    await loadSparkeryLocaleOverrides(defaultLanguage);
    await i18n.changeLanguage(defaultLanguage);
  })();
}

export const changeLanguage = (language: string) => {
  void (async () => {
    await loadLanguageBundle(language);
    if (language.startsWith('zh')) {
      await loadSparkeryLocaleOverrides(language);
    }
    await i18n.changeLanguage(language);
    localStorage.setItem('wendeal-dashboard-language', language);
    window.dispatchEvent(
      new CustomEvent('languageChanged', {
        detail: { language },
      })
    );
  })();
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
