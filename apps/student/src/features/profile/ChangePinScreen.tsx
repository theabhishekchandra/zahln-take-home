import { authorizeWithBiometrics, biometricsEnabled } from '@zahln/application';
import { useTranslation } from '@zahln/i18n';
import { announce, AppText, Icon, IconButton, StepBars, useTheme } from '@zahln/ui-native';
import { router } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { View } from 'react-native';

import { PinCheck } from '@/features/pin/PinEntry';
import { PinLayout } from '@/features/pin/PinLayout';
import { useNewPin } from '@/features/pin/use-new-pin';
import { useDependencies } from '@/lib/dependencies';

const STEPS = 3;

type Stage = { readonly step: 'starting' } | { readonly step: 'current' } | { readonly step: 'new'; readonly confirmedBy: 'fingerprint' | 'pin' };

/**
 * Design screen 20: prove it's you (fingerprint, or the current PIN), then choose
 * the new PIN and type it again. The old PIN works until the new one is saved.
 */
export function ChangePinScreen() {
  const { t } = useTranslation();
  const { biometrics } = useDependencies();
  const [stage, setStage] = useState<Stage>({ step: 'starting' });
  const [canUseFingerprint, setCanUseFingerprint] = useState(false);

  const askFingerprint = async () => {
    const result = await authorizeWithBiometrics(biometrics, { title: t('changePin.bioPrompt'), cancelLabel: t('changePin.usePin') });
    setStage(result === 'authorized' ? { step: 'new', confirmedBy: 'fingerprint' } : { step: 'current' });
  };

  // On opening: the fingerprint if it's on, else straight to the current PIN. The PIN pad offers it again.
  const start = useEffectEvent((enabled: boolean) => {
    setCanUseFingerprint(enabled);
    if (enabled) void askFingerprint();
    else setStage({ step: 'current' });
  });
  useEffect(() => {
    biometricsEnabled(biometrics).then(start, () => start(false));
  }, [biometrics]);

  switch (stage.step) {
    case 'starting':
      return <View style={{ flex: 1 }} />;
    case 'current':
      return (
        <PinCheck
          title={t('changePin.currentTitle')}
          context={<StepBars step={1} total={STEPS} accessibilityLabel={t('changePin.step', { step: 1, total: STEPS })} />}
          onCorrect={() => setStage({ step: 'new', confirmedBy: 'pin' })}
          onCancel={() => router.back()}
          onBiometrics={canUseFingerprint ? () => void askFingerprint() : undefined}
        />
      );
    case 'new':
      return <NewPin confirmedBy={stage.confirmedBy} />;
  }
}

function NewPin({ confirmedBy }: { readonly confirmedBy: 'fingerprint' | 'pin' }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { input, step, error } = useNewPin(() => {
    announce(t('changePin.done'));
    router.back();
  });
  const stepNumber = step === 'choose' ? 2 : 3;

  return (
    <PinLayout
      input={input}
      title={step === 'choose' ? t('changePin.chooseTitle') : t('onboarding.confirmTitle')}
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
          <StepBars step={stepNumber} total={STEPS} accessibilityLabel={t('changePin.step', { step: stepNumber, total: STEPS })} />
          <View style={{ width: theme.size.tapMin }} />
        </View>
      }
      badge={
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing[2],
            paddingVertical: theme.spacing[2],
            paddingHorizontal: 14,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.brandTint,
          }}>
          <Icon name="tick" size={16} strokeWidth={2.4} color={theme.colors.brand} />
          <AppText variant="label" style={{ color: theme.colors.brand, fontSize: 13 }}>
            {t(confirmedBy === 'fingerprint' ? 'changePin.confirmedFingerprint' : 'changePin.confirmedPin')}
          </AppText>
        </View>
      }
      footnote={step === 'choose' ? t('changePin.nextNote') : t('changePin.confirmNote')}>
      <AppText tone="secondary" style={{ textAlign: 'center' }}>
        {step === 'choose' ? t('changePin.chooseBody') : t('onboarding.confirmBody')}
      </AppText>
      {error ? (
        <AppText variant="bodyStrong" tone="danger" style={{ textAlign: 'center' }} accessibilityLiveRegion="assertive">
          {error}
        </AppText>
      ) : null}
    </PinLayout>
  );
}
