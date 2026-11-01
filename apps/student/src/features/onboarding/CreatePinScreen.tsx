import { useTranslation } from '@zahln/i18n';
import { announce, AppText, Icon, useTheme } from '@zahln/ui-native';
import { router } from 'expo-router';
import { View } from 'react-native';

import { PinLayout } from '@/features/pin/PinLayout';
import { useNewPin } from '@/features/pin/use-new-pin';

import { StepPill } from './StepPill';

/** Design screen 28: choose the app PIN, then type it again. Weak PINs are refused with the rule they break. */
export function CreatePinScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { input, step, error } = useNewPin(() => {
    announce(t('onboarding.pinSaved'));
    router.replace('/onboarding/biometrics');
  });

  const rule = (text: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
      <Icon name="tick" size={16} strokeWidth={2.6} color={theme.colors.brand} />
      <AppText variant="caption" tone="secondary">
        {text}
      </AppText>
    </View>
  );

  return (
    <PinLayout
      input={input}
      title={step === 'choose' ? t('onboarding.createTitle') : t('onboarding.confirmTitle')}
      header={
        <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: theme.size.tapMin }}>
          <StepPill step={1} />
        </View>
      }>
      <AppText tone="secondary" style={{ textAlign: 'center' }}>
        {step === 'choose' ? t('onboarding.createBody') : t('onboarding.confirmBody')}
      </AppText>
      {error ? (
        <AppText variant="bodyStrong" tone="danger" style={{ textAlign: 'center' }} accessibilityLiveRegion="assertive">
          {error}
        </AppText>
      ) : null}
      {step === 'choose' ? (
        <View style={{ gap: theme.spacing[1], marginTop: theme.spacing[2] }}>
          {rule(t('onboarding.ruleRepeated'))}
          {rule(t('onboarding.ruleSequence'))}
        </View>
      ) : null}
    </PinLayout>
  );
}
