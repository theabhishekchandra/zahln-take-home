import { useTranslation } from '@zahln/i18n';
import { Pill } from '@zahln/ui-native';

export const ONBOARDING_STEPS = 2;

/** "1 of 2", read as "Setup, step 1 of 2". */
export function StepPill({ step }: { readonly step: number }) {
  const { t } = useTranslation();
  return (
    <Pill
      label={t('onboarding.stepShort', { step, total: ONBOARDING_STEPS })}
      accessibilityLabel={t('onboarding.step', { step, total: ONBOARDING_STEPS })}
    />
  );
}
