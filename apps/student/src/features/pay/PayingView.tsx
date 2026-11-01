import type { PaymentIntent } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { announce, AppText, Button, Screen, StepTracker, useTheme } from '@zahln/ui-native';
import { useEffect } from 'react';
import { View } from 'react-native';

import type { AuthMethod } from '@zahln/application';

import { MerchantSummary } from './MerchantSummary';

/** Design screen 09: the payment is on its way. Nothing can be tapped twice, back does nothing. */
export function PayingView({ intent, authMethod }: { readonly intent: PaymentIntent; readonly authMethod: AuthMethod | null }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const { quote } = intent;

  useEffect(() => announce(t('paying.spoken', { amount: format.moneySpoken(quote.total) })), [t, format, quote.total]);

  return (
    <Screen
      footer={
        <>
          <Button label={t('paying.inProgress')} loading loadingLabel={`${t('paying.title')}`} disabled onPress={() => undefined} />
          <AppText variant="caption" tone="muted" style={{ textAlign: 'center', fontSize: 12 }}>
            {t('paying.footer')}
          </AppText>
        </>
      }>
      <View style={{ minHeight: theme.size.tapMin, alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="bodyStrong" accessibilityRole="header">
          {t('paying.title')}
        </AppText>
      </View>
      <MerchantSummary quote={quote} />
      <StepTracker
        steps={[
          { label: authMethod === 'pin' ? t('paying.stepPin') : t('paying.stepBiometrics'), status: 'done' },
          { label: t('paying.stepSend'), status: 'active' },
          { label: t('paying.stepConfirm'), status: 'pending' },
        ]}
      />
    </Screen>
  );
}
