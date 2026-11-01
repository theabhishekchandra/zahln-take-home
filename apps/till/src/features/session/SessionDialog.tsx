import { useTranslation } from '@zahln/i18n';
import { AppText, Button, Icon, Overlay, useTheme } from '@zahln/ui-native';
import { useState } from 'react';
import { View } from 'react-native';

export interface SessionDialogProps {
  readonly visible: boolean;
  /** Items in the open order or ticket, which are kept. */
  readonly itemCount: number;
  /** Logs in as this till's cashier again. False if it still didn't work. */
  readonly onSignInAgain: () => Promise<boolean>;
  readonly onOtherTill: () => void;
}

/**
 * T9: the session ended and the till couldn't log in again by itself. Signing
 * in again carries on with the same order.
 */
export function SessionDialog({ visible, itemCount, onSignInAgain, onOtherTill }: SessionDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    setBusy(true);
    const signedIn = await onSignInAgain();
    setBusy(false);
    setFailed(!signedIn);
  };

  return (
    <Overlay visible={visible} placement="center">
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{ alignSelf: 'center', width: 64, height: 64, borderRadius: 20, backgroundColor: theme.colors.brandTint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="lock" size={30} color={theme.colors.brand} />
      </View>
      <AppText variant="titleM" accessibilityRole="header" style={{ textAlign: 'center' }}>
        {t('till.session.title')}
      </AppText>
      <AppText tone="secondary" style={{ textAlign: 'center' }}>
        {itemCount > 0 ? t('till.session.body', { count: itemCount }) : t('till.session.bodyEmpty')}
      </AppText>
      {failed ? (
        <AppText tone="danger" accessibilityLiveRegion="assertive" style={{ textAlign: 'center' }}>
          {t('till.session.failed')}
        </AppText>
      ) : null}
      <Button size="large" label={t('till.session.retry')} loading={busy} onPress={() => void retry()} />
      <Button label={t('till.session.other')} variant="text" disabled={busy} onPress={onOtherTill} />
    </Overlay>
  );
}
