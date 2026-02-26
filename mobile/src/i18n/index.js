// i18n translation system
import en from './en';
import te from './te';
import hi from './hi';
import useAuthStore from '../store/authStore';

const translations = { en, te, hi };

/**
 * Get a nested value from an object using a dot-separated path.
 * e.g. getNestedValue(obj, 'auth.loginTitle') => obj.auth.loginTitle
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

/**
 * Custom hook for translations.
 * Usage:
 *   const { t } = useTranslation();
 *   <Text>{t('auth.loginTitle')}</Text>      // "Login" or "లాగిన్" etc.
 *   <Text>{t('farmerHome.greeting')}</Text>   // "Hello" or "నమస్కారం"
 */
export const useTranslation = () => {
  const language = useAuthStore((state) => state.language) || 'en';

  const t = (key, fallback) => {
    const langData = translations[language] || translations.en;
    const value = getNestedValue(langData, key);

    if (value !== undefined) return value;

    // Fallback to English if key is missing in selected language
    if (language !== 'en') {
      const enValue = getNestedValue(translations.en, key);
      if (enValue !== undefined) return enValue;
    }

    // Final fallback: return provided fallback or the key itself
    return fallback || key;
  };

  return { t, language };
};

/**
 * Non-hook version for use outside React components.
 * Pass the language code directly.
 */
export const translate = (key, language = 'en', fallback) => {
  const langData = translations[language] || translations.en;
  const value = getNestedValue(langData, key);

  if (value !== undefined) return value;

  if (language !== 'en') {
    const enValue = getNestedValue(translations.en, key);
    if (enValue !== undefined) return enValue;
  }

  return fallback || key;
};

export default translations;
