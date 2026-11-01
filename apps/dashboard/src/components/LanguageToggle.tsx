import { LANGUAGES, useLanguage, useTranslation } from '@zahln/i18n';

/** DE / EN, as on W1. */
export function LanguageToggle() {
  const { t } = useTranslation();
  const [language, setLanguage] = useLanguage();
  return (
    <div role="group" aria-label={t('dashboard.language')} className="segmented small">
      {LANGUAGES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={language === option}
          onClick={() => {
            setLanguage(option);
            document.documentElement.lang = option;
          }}>
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
