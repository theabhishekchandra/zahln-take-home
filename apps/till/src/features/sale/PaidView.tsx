import type { Order, Payment } from '@zahln/domain';
import { ticketItemCount } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { announce, AppText, Button, DetailRow, ResultIcon, useCountdown, useReduceMotion, useTheme } from '@zahln/ui-native';
import { hero } from '@zahln/ui-tokens';
import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { PanelActions, SaleLayout } from './SaleLayout';

/** The next order opens by itself after this, unless the cashier taps first. */
const AUTO_NEXT_SECONDS = 8;

export interface PaidViewProps {
  readonly order: Order;
  readonly payment: Payment;
  readonly onNext: () => void;
}

/** T4: shown only for a payment the server confirmed, with the amount and group it charged. */
export function PaidView({ order, payment, onNext }: PaidViewProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const [deadline] = useState(() => Date.now() + AUTO_NEXT_SECONDS * 1000);
  const seconds = useCountdown(deadline);
  const price = t(`priceChip.${payment.priceGroup}`);

  useEffect(() => announce(t('till.paid.spoken', { amount: format.moneySpoken(payment.amount), price })), [t, format, payment.amount, price]);
  useEffect(() => {
    if (seconds === 0) onNext();
  }, [seconds, onNext]);

  return (
    <SaleLayout
      ground="brand"
      main={
        <View accessible accessibilityRole="summary" style={{ alignItems: 'center', gap: theme.spacing[4] }}>
          <ResultIcon icon="tick" color={theme.colors.brand} background="#ffffff" size={150} />
          <AppText variant="titleS" style={{ color: hero.inkMuted, fontSize: 22 }}>
            {t('till.paid.title')}
          </AppText>
          <AppText
            variant="amount"
            accessibilityLabel={format.moneySpoken(payment.amount)}
            style={{ color: theme.colors.onBrand, fontSize: 96, lineHeight: 104, letterSpacing: -4 }}
            maxFontSizeMultiplier={1}>
            {format.money(payment.amount)}
          </AppText>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: theme.radius.pill, paddingVertical: 8, paddingHorizontal: 18 }}>
            <AppText variant="bodyStrong" style={{ color: theme.colors.onBrand }}>
              {t('till.paid.group', { price, time: format.time(payment.updatedAt) })}
            </AppText>
          </View>
        </View>
      }
      panel={
        <>
          <AppText variant="titleS" accessibilityRole="header">
            {t('till.paid.details')}
          </AppText>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, paddingHorizontal: 18 }}>
            <DetailRow label={t('till.paid.items')} value={String(ticketItemCount(order.items))} />
            <DetailRow label={t('till.paid.priceGroup')} value={t(`priceGroup.${payment.priceGroup}`)} />
            <DetailRow label={t('till.paid.confirmedBy')} value={t('till.paid.server')} />
            <DetailRow label={t('till.paid.paymentId')} value={payment.id} mono divider={false} />
          </View>
          <PanelActions>
            <Button size="large" label={t('till.paid.next')} onPress={onNext} />
            <AutoNextBar seconds={seconds} />
            <AppText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
              {t('till.paid.auto', { seconds })}
            </AppText>
          </PanelActions>
        </>
      }
    />
  );
}

/** Fills up until the next order opens: smoothly, or a step a second with reduced motion. */
function AutoNextBar({ seconds }: { readonly seconds: number }) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduceMotion) return;
    const fill = Animated.timing(progress, { toValue: 1, duration: AUTO_NEXT_SECONDS * 1000, easing: Easing.linear, useNativeDriver: false });
    fill.start();
    return () => fill.stop();
  }, [progress, reduceMotion]);
  const width = reduceMotion
    ? `${((AUTO_NEXT_SECONDS - seconds) / AUTO_NEXT_SECONDS) * 100}%`
    : progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.disabledFill, overflow: 'hidden' }}>
      <Animated.View style={{ height: 6, width, backgroundColor: theme.colors.brand }} />
    </View>
  );
}
