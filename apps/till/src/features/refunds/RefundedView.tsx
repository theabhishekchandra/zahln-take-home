import { refundableAmount, type Payment, type Refund } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { announce, AppText, Button, DetailRow, ResultIcon, useTheme } from '@zahln/ui-native';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';

export interface RefundedViewProps {
  /** The payment as the server reports it after the refund. */
  readonly payment: Payment;
  readonly refund: Refund;
  readonly onBack: () => void;
  readonly onTakePayment: () => void;
}

/** T12: the server confirmed the refund; totals are the server's. */
export function RefundedView({ payment, refund, onBack, onTakePayment }: RefundedViewProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const title = t('till.refunds.done', { amount: format.money(refund.amount) });
  useEffect(() => announce(t('till.refunds.done', { amount: format.moneySpoken(refund.amount) })), [t, format, refund.amount]);
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing[8] }}>
      <View
        style={{
          width: '100%',
          maxWidth: 560,
          backgroundColor: theme.colors.surfaceRaised,
          borderRadius: 32,
          padding: 40,
          gap: theme.spacing[4],
          alignItems: 'stretch',
          boxShadow: theme.elevation.sheet,
        }}>
        <ResultIcon icon="tick" color={theme.colors.onBrand} background={theme.colors.brand} />
        <AppText variant="titleL" style={{ fontSize: 34, lineHeight: 40, textAlign: 'center' }}>
          {title}
        </AppText>
        <AppText tone="secondary" style={{ fontSize: 17, lineHeight: 25, textAlign: 'center' }}>
          {t('till.refunds.doneBody')}
        </AppText>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, paddingHorizontal: 18 }}>
          <DetailRow label={t('till.refunds.original')} value={format.money(payment.amount)} />
          <DetailRow label={t('till.refunds.refundedTotal')} value={format.money(payment.refunded)} />
          <DetailRow label={t('till.refunds.stillRefundable')} value={format.money(refundableAmount(payment))} divider={false} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}>
          <View style={{ flex: 1 }}>
            <Button size="large" variant="secondary" label={t('till.refunds.back')} onPress={onBack} />
          </View>
          <View style={{ flex: 1 }}>
            <Button size="large" label={t('till.refunds.takePayment')} onPress={onTakePayment} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
