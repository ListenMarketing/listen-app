import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { setApiLanguage } from '@/api/normalize';
import en from './en.json';
import it from './it.json';

/**
 * Italiano e inglese al lancio. Per aggiungere le altre 4 lingue del sito basta
 * un file in questa cartella e una riga in `resources`.
 */
export const resources = { it: { translation: it }, en: { translation: en } } as const;
export const SUPPORTED = Object.keys(resources);

function deviceLanguage(): string {
  try {
    const code = getLocales()[0]?.languageCode ?? 'it';
    return SUPPORTED.includes(code) ? code : 'en';
  } catch {
    return 'it';
  }
}

if (!i18n.isInitialized) {
  const lng = deviceLanguage();
  setApiLanguage(lng);
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: 'it',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  i18n.on('languageChanged', setApiLanguage);
}

export default i18n;
