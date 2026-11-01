import type { LatePayment } from '@zahln/application';
import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, Button, NoticeCard, useExternalStore, useTheme } from '@zahln/ui-native';
import { router } from 'expo-router';
import { View } from 'react-native';

import { useDependencies } from '@/lib/dependencies';

/**
 * Orders the cashier set aside that were paid after all (Zahln's API can't
 * cancel an order). Stays until the cashier opens the refund or says it's
 * done, so it's never missed.
 */
export function LatePayments() {
  const theme = useTheme();
  const { t } = useTranslation();
  const setAside = useDependencies().setAside();
  const { latePayments } = useExternalStore(setAside);
  if (latePayments.length === 0) return null;

  const refund = (late: LatePayment) => {
    setAside.dismiss(late.payment.id);
    router.replace({ pathname: '/refunds', params: { payment: late.payment.id } });
  };

  return (
    <View accessibilityLiveRegion="assertive" style={{ paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[3], gap: theme.spacing[2] }}>
      <AppText variant="bodyStrong" accessibilityRole="header">
        {t('till.late.title', { count: latePayments.length })}
      </AppText>
      {latePayments.map((late) => (
        <LateRow key={late.payment.id} late={late} onRefund={() => refund(late)} onDismiss={() => setAside.dismiss(late.payment.id)} />
      ))}
    </View>
  );
}

function LateRow({ late, onRefund, onDismiss }: { readonly late: LatePayment; readonly onRefund: () => void; readonly onDismiss: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}>
      <View style={{ flex: 1 }}>
        <NoticeCard
          tone="pending"
          title={t('till.late.body', { amount: format.money(late.payment.amount), order: late.order.id, time: format.time(late.payment.updatedAt) })}
        />
      </View>
      <Button label={t('till.late.refund')} onPress={onRefund} />
      <Button variant="text" label={t('till.late.dismiss')} onPress={onDismiss} />
    </View>
  );
}
