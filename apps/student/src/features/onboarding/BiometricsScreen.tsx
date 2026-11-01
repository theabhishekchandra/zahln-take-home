import { setBiometricsEnabled } from '@zahln/application';
import { useTranslation } from '@zahln/i18n';
import { AppText, Button, Icon, NoticeCard, Screen, useTheme } from '@zahln/ui-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useDependencies } from '@/lib/dependencies';

import { StepPill } from './StepPill';

/** Design screen 29: offer the fingerprint. Skippable; the PIN always works. */
export function BiometricsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { biometrics } = useDependencies();
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    biometrics.authenticator.isAvailable().then(setAvailable, () => setAvailable(false));
  }, [biometrics]);

  const finish = () => router.replace('/home');

  const turnOn = async () => {
    const result = await biometrics.authenticator.authenticate({ title: t('onboarding.bioPrompt'), cancelLabel: t('common.cancel') });
    if (result !== 'authorized') return;
    await setBiometricsEnabled(biometrics, true);
    finish();
  };

  const point = (text: string) => (
    <View style={{ flexDirection: 'row', gap: theme.spacing[3], alignItems: 'flex-start' }}>
      <Icon name="tick" size={20} strokeWidth={2.6} color={theme.colors.brand} />
      <AppText style={{ flex: 1 }}>{text}</AppText>
    </View>
  );

  return (
    <Screen
      scroll
      footer={
        available ? (
          <>
            <Button label={t('onboarding.bioOn')} onPress={() => void turnOn()} />
            <Button label={t('onboarding.bioSkip')} variant="text" onPress={finish} />
          </>
        ) : (
          <Button label={t('common.continue')} onPress={finish} disabled={available === null} />
        )
      }>
      <View style={{ alignItems: 'center', minHeight: theme.size.tapMin, justifyContent: 'center' }}>
        <StepPill step={2} />
      </View>
      <View style={{ alignItems: 'center', gap: theme.spacing[4], marginTop: theme.spacing[8] }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 32,
            backgroundColor: theme.colors.brandTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="fingerprint" size={52} strokeWidth={1.6} color={theme.colors.brand} />
        </View>
        <AppText variant="titleM" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {t('onboarding.bioTitle')}
        </AppText>
        <AppText tone="secondary" style={{ textAlign: 'center' }}>
          {t('onboarding.bioBody')}
        </AppText>
      </View>
      {available === false ? (
        <NoticeCard tone="reassure" title={t('onboarding.bioUnavailable')} />
      ) : (
        <View style={{ gap: theme.spacing[3], marginTop: theme.spacing[2] }}>
          {point(t('onboarding.bioPointAsk'))}
          {point(t('onboarding.bioPointPin'))}
          <AppText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            {t('onboarding.bioLater')}
          </AppText>
        </View>
      )}
    </Screen>
  );
}
