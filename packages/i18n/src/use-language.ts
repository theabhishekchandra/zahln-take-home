import { useTranslation } from 'react-i18next';

import { DEFAULT_LANGUAGE, isLanguage, type Language } from './i18n';

/** The active language and a way to change it, for formatting money and dates on screen. */
export function useLanguage(): readonly [Language, (language: Language) => void] {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage;
  const language = isLanguage(current) ? current : DEFAULT_LANGUAGE;
  return [language, (next) => void i18n.changeLanguage(next)] as const;
}
