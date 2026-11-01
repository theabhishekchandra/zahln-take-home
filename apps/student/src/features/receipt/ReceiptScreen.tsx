import type { PaymentWatchState } from '@zahln/application';
import type { PaymentDetail, PaymentId } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, Button, Card, DetailRow, IconButton, NoticeCard, Screen, StatusLabel, useCountdown, useExternalStore, useTheme } from '@zahln/ui-native';
import { router } from 'expo-router';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Share, View } from 'react-native';

import { useDependencies } from '@/lib/dependencies';
import { paymentStatus } from '@/lib/payment-status';

import { receiptText } from './receipt-text';

/**
 * Screens 17 and 18: a payment as Zahln has it now. While Zahln is still
 * deciding it, the screen says so, reads it again by itself and offers
 * "Check now", which only reads: it can never pay a second time.
 */
export function ReceiptScreen({ paymentId }: { readonly paymentId: PaymentId }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { watchPayment } = useDependencies();
  const watcher = useMemo(() => watchPayment(paymentId), [watchPayment, paymentId]);
  useEffect(() => {
    watcher.start();
    return () => watcher.stop();
  }, [watcher]);
  const state = useExternalStore(watcher);

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
        <IconButton icon="back" accessibilityLabel={t('receipt.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/activity'))} />
        <AppText variant="titleM" accessibilityRole="header">
          {t('receipt.title')}
        </AppText>
      </View>
      {state.payment ? (
        <Receipt payment={state.payment} state={state} onCheckNow={() => watcher.checkNow()} />
      ) : state.failed ? (
        <>
          <NoticeCard tone="problem" title={state.gone ? t('receipt.gone') : t('receipt.failed')} />
          {state.gone ? null : <Button variant="secondary" label={t('receipt.retry')} onPress={() => watcher.checkNow()} />}
        </>
      ) : null}
    </Screen>
  );
}

function Receipt({ payment, state, onCheckNow }: { readonly payment: PaymentDetail; readonly state: PaymentWatchState; readonly onCheckNow: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const status = paymentStatus(payment, t, format);
  const checking = payment.status === 'pending';

  return (
    <>
      <Card style={{ padding: theme.spacing[5], gap: theme.spacing[2] }}>
        <AppText variant="bodyStrong">{payment.mensa.name}</AppText>
        <AppText tone="secondary">{format.dateTime(payment.createdAt)}</AppText>
        <AppText variant="titleL" accessibilityLabel={format.moneySpoken(payment.amount)} style={{ fontVariant: ['tabular-nums'] }}>
          {format.money(payment.amount)}
        </AppText>
        <StatusLabel kind={status.kind} label={status.label} />
      </Card>

      {state.failed ? <NoticeCard tone="problem" title={t('receipt.stale')} /> : null}
      {checking ? (
        <NoticeCard tone="pending" title={t('receipt.checkingTitle')} body={t('receipt.checkingBody')} />
      ) : payment.refundPending.cents > 0 ? (
        <NoticeCard tone="pending" title={t('receipt.refundTitle')} body={t('receipt.refundBody', { amount: format.money(payment.refundPending) })} />
      ) : null}
      {checking || payment.refundPending.cents > 0 || state.failed ? <Recheck state={state} onCheckNow={onCheckNow} /> : null}

      <Section title={t('receipt.items')}>
        {payment.items.map((item) => (
          <DetailRow
            key={item.itemId}
            label={`${item.quantity}× ${format.text(item.name)}`}
            value={format.money({ ...item.unitPrice, cents: item.unitPrice.cents * item.quantity })}
          />
        ))}
        <DetailRow label={t('receipt.total')} value={format.money(payment.amount)} divider={false} />
      </Section>

      {payment.refunds.length > 0 ? (
        <Section title={t('receipt.refunds')}>
          {payment.refunds.map((refund, index) => (
            <DetailRow
              key={refund.id}
              label={`${format.dateTime(refund.createdAt)} · ${t(`receipt.refundStatus.${refund.status}`)}`}
              value={format.debit(refund.amount)}
              divider={index < payment.refunds.length - 1}
            />
          ))}
        </Section>
      ) : null}

      <Section title={t('receipt.details')}>
        <DetailRow label={t('receipt.priceGroup')} value={t(`priceGroup.${payment.priceGroup}`)} />
        <DetailRow label={t('receipt.place')} value={payment.till.name} />
        <DetailRow label={t('receipt.orderId')} value={payment.orderId} mono />
        <DetailRow label={t('receipt.paymentId')} value={payment.id} mono divider={false} />
      </Section>

      <Section title={t('receipt.history')}>
        {payment.history.map((event, index) => (
          <DetailRow
            key={`${event.at}-${event.type}-${event.refundId ?? ''}`}
            label={t(`receipt.event.${event.type}`)}
            value={format.time(event.at)}
            divider={index < payment.history.length - 1}
          />
        ))}
      </Section>

      <Button
        variant="secondary"
        label={t('receipt.share')}
        onPress={() => void Share.share({ title: t('receipt.shareTitle'), message: receiptText(payment, status.label, t, format) })}
      />
    </>
  );
}

/** Screen 18's line: when Zahln is asked next, how often it was, and "Check now". */
function Recheck({ state, onCheckNow }: { readonly state: PaymentWatchState; readonly onCheckNow: () => void }) {
  const { t } = useTranslation();
  const seconds = useCountdown(state.recheck.nextCheckAt);
  const line = state.recheck.checking ? t('checking.checkingNow') : state.recheck.nextCheckAt !== null ? t('checking.nextCheck', { seconds }) : null;
  return (
    <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: 4 }}>
      {line ? (
        <AppText variant="bodyStrong" tone="pending">
          {line}
        </AppText>
      ) : null}
      {state.recheck.checks > 0 ? (
        <AppText variant="caption" tone="muted">
          {t('checking.checked', { count: state.recheck.checks })}
        </AppText>
      ) : null}
      <Button variant="secondary" label={t('checking.checkNow')} disabled={state.recheck.checking} onPress={onCheckNow} />
    </View>
  );
}

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing[2] }}>
      <AppText variant="label" tone="secondary" accessibilityRole="header">
        {title}
      </AppText>
      <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>{children}</Card>
    </View>
  );
}
