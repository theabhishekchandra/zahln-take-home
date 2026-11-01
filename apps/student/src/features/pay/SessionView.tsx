import { useTranslation } from '@zahln/i18n';
import { AppText, Button, Overlay, Screen } from '@zahln/ui-native';

export interface SessionViewProps {
  readonly canUseBiometrics: boolean;
  readonly onSignIn: () => void;
  readonly onOtherAccount: () => void;
}

/** Design screen 14: signed out before anything was charged. Signing in again reopens the same order. */
export function SessionView({ canUseBiometrics, onSignIn, onOtherAccount }: SessionViewProps) {
  const { t } = useTranslation();
  return (
    <Screen>
      <Overlay visible placement="center">
        <AppText variant="titleS" accessibilityRole="header">
          {t('session.title')}
        </AppText>
        <AppText tone="secondary">{t('session.body')}</AppText>
        <Button label={canUseBiometrics ? t('session.signIn') : t('session.signInPin')} onPress={onSignIn} />
        <Button label={t('session.other')} variant="text" onPress={onOtherAccount} />
      </Overlay>
    </Screen>
  );
}
