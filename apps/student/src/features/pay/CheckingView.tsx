import type { RecheckStatus } from '@zahln/application';
import type { PaymentIntent } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, Button, Card, NoticeCard, useCountdown, useTheme } from '@zahln/ui-native';
import { View } from 'react-native';

import { ResultLayout } from './ResultLayout';

export interface CheckingViewProps {
  readonly intent: PaymentIntent;
  readonly recheck: RecheckStatus;
  readonly onCheckNow: () => void;
  readonly onHome: () => void;
}

/**
 * Design screen 11: the outcome is not known. Never shown as failed; the app
 * keeps checking the same payment, with the same key, until the server says.
 */
export function CheckingView({ intent, recheck, onCheckNow, onHome }: CheckingViewProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const seconds = useCountdown(recheck.nextCheckAt);
  const { quote } = intent;

  const status = recheck.checking
    ? t('checking.checkingNow')
    : recheck.nextCheckAt !== null
      ? t('checking.nextCheck', { seconds })
      : null;

  return (
    <ResultLayout
      icon="clock"
      tone="pending"
      title={t('checking.title')}
      body={t('checking.body')}
      spoken={t('checking.spoken')}
      footer={
        <>
          <Button label={t('checking.checkNow')} variant="secondary" disabled={recheck.checking} onPress={onCheckNow} />
          <Button label={t('common.backToHome')} variant="text" onPress={onHome} />
        </>
      }>
      <Card style={{ paddingVertical: theme.spacing[4], paddingHorizontal: 18, gap: theme.spacing[1] }}>
        <AppText variant="bodyStrong">{quote.mensa.name}</AppText>
        <AppText variant="titleM" accessibilityLabel={format.moneySpoken(quote.total)} style={{ fontVariant: ['tabular-nums'] }}>
          {format.money(quote.total)}
        </AppText>
      </Card>
      <NoticeCard tone="reassure" title={t('checking.notTwiceTitle')} body={t('checking.notTwiceBody')} />
      <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 2 }}>
        {status ? (
          <AppText variant="bodyStrong" tone="pending">
            {status}
          </AppText>
        ) : null}
        {recheck.checks > 0 ? (
          <AppText variant="caption" tone="muted">
            {t('checking.checked', { count: recheck.checks })}
          </AppText>
        ) : null}
      </View>
    </ResultLayout>
  );
}
