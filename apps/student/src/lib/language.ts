import type { SecureStorage } from '@zahln/application';
import { isLanguage, useLanguage, type createI18n, type Language } from '@zahln/i18n';

import { useDependencies } from './dependencies';

const KEY = 'zahln.language';

/** A language chosen in the app wins over the phone's; applied before the first screen. */
export async function applySavedLanguage(storage: SecureStorage, i18n: ReturnType<typeof createI18n>): Promise<void> {
  const saved = (await storage.get(KEY)) ?? undefined;
  if (isLanguage(saved) && saved !== i18n.resolvedLanguage) await i18n.changeLanguage(saved);
}

/** `useLanguage`, but the choice is kept for the next start. */
export function useSavedLanguage(): readonly [Language, (language: Language) => void] {
  const [language, setLanguage] = useLanguage();
  const { settings } = useDependencies();
  return [
    language,
    (next) => {
      setLanguage(next);
      void settings.set(KEY, next);
    },
  ] as const;
}
