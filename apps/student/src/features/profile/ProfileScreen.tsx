import { biometricsEnabled, setBiometricsEnabled } from '@zahln/application';
import { LANGUAGES, useTranslation } from '@zahln/i18n';
import { AppText, Avatar, Card, initials, Pill, Screen, SegmentedControl, SettingsGroup, SettingsRow, useTheme } from '@zahln/ui-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { useAccount, useSignedInUser } from '@/lib/account';
import { useDependencies } from '@/lib/dependencies';
import { useSavedLanguage } from '@/lib/language';

/** Design screen 19. Payment notifications are left out: Zahln has no notification feed. */
export function ProfileScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [language, setLanguage] = useSavedLanguage();
  const user = useSignedInUser();
  const account = useAccount();
  const { version } = useDependencies();
  const fingerprint = useFingerprintSetting();

  const signOut = () => {
    account.signOut();
    router.replace('/');
  };

  return (
    <Screen scroll>
      <AppText variant="titleL" accessibilityRole="header">
        {t('profile.title')}
      </AppText>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: theme.spacing[4] }}>
        <Avatar initials={initials(user.name)} shape="circle" size={56} selected />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" style={{ fontSize: 17 }}>
            {user.name}
          </AppText>
          <AppText variant="caption" tone="muted">
            {t('profile.testAccount')}
          </AppText>
        </View>
        <Pill label={t(`priceGroup.${user.priceGroup}`)} tone={user.priceGroup === 'staff' ? 'staff' : 'brand'} />
      </Card>

      <SettingsGroup title={t('profile.payments')}>
        <SettingsRow
          icon="fingerprint"
          label={t('profile.fingerprint')}
          description={fingerprint.available === false ? t('profile.fingerprintUnavailable') : undefined}
          toggle={{ value: fingerprint.on, onChange: fingerprint.set, disabled: !fingerprint.available }}
          divider
        />
        <SettingsRow icon="lock" label={t('profile.changePin')} onPress={() => router.push('/change-pin')} />
      </SettingsGroup>

      <SettingsGroup title={t('profile.app')}>
        <SettingsRow
          icon="globe"
          tint="staff"
          label={t('profile.language')}
          divider
          accessory={
            <SegmentedControl
              accessibilityLabel={t('profile.language')}
              selected={language}
              onSelect={setLanguage}
              options={LANGUAGES.map((option) => ({ value: option, label: option.toUpperCase(), accessibilityLabel: t(`profile.languageName.${option}`) }))}
            />
          }
        />
        <SettingsRow
          icon="shield"
          tint="staff"
          label={t('profile.privacy')}
          description={t(Platform.OS === 'ios' ? 'profile.privacyIos' : 'profile.privacyAndroid')}
          divider
        />
        <SettingsRow icon="swap" tint="staff" label={t('profile.switchUser')} onPress={() => router.replace('/')} />
      </SettingsGroup>

      <Pressable
        accessibilityRole="button"
        onPress={signOut}
        style={({ pressed }) => ({
          minHeight: theme.size.tapMin,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.control,
          backgroundColor: pressed ? theme.colors.pressed : theme.colors.surfaceRaised,
          boxShadow: theme.elevation.card,
        })}>
        <AppText variant="bodyStrong" tone="danger">
          {t('profile.signOut')}
        </AppText>
      </Pressable>
      <AppText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        {t('profile.version', { version })}
      </AppText>
    </Screen>
  );
}

/** "Pay with fingerprint": turning it on asks for the fingerprint once, as in onboarding. */
function useFingerprintSetting() {
  const { t } = useTranslation();
  const { biometrics } = useDependencies();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [on, setOn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      Promise.all([biometrics.authenticator.isAvailable(), biometricsEnabled(biometrics)]).then(
        ([canUse, enabled]) => {
          if (!live) return;
          setAvailable(canUse);
          setOn(enabled);
        },
        () => live && setAvailable(false),
      );
      return () => {
        live = false;
      };
    }, [biometrics]),
  );

  const set = async (next: boolean) => {
    if (next) {
      const result = await biometrics.authenticator.authenticate({ title: t('onboarding.bioPrompt'), cancelLabel: t('common.cancel') });
      if (result !== 'authorized') return;
    }
    await setBiometricsEnabled(biometrics, next);
    setOn(next);
  };

  return { available, on, set: (next: boolean) => void set(next) };
}
