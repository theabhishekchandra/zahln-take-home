import i18next, { type i18n } from 'i18next';

import { de } from './resources/de';
import { en } from './resources/en';

export const LANGUAGES = ['de', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** German first: the default for a German campus when the device prefers neither. */
export const DEFAULT_LANGUAGE: Language = 'de';

const LOCALES: Record<Language, string> = { de: 'de-DE', en: 'en-GB' };

export const resources = { de: { translation: de }, en: { translation: en } } as const;

/** Picks the first supported language from the device's preferences, e.g. ["en-US", "de-DE"]. */
export function resolveLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    const match = LANGUAGES.find((language) => language === base);
    if (match) return match;
  }
  return DEFAULT_LANGUAGE;
}

export function localeFor(language: Language): string {
  return LOCALES[language];
}

/** A separate instance per app, initialised synchronously so the first frame is translated. */
export function createI18n(language: Language): i18n {
  const instance = i18next.createInstance();
  void instance.init({
    resources,
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    initAsync: false,
    returnNull: false,
  });
  return instance;
}

export function isLanguage(value: string | undefined): value is Language {
  return LANGUAGES.some((language) => language === value);
}
