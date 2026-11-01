import type { Payment } from '@zahln/domain';
import { useFormat, useTranslation, type Format } from '@zahln/i18n';
import { StatusLabel, TransactionRow } from '@zahln/ui-native';

import { paymentStatus } from '@/lib/payment-status';

export interface PaymentRowProps {
  readonly payment: Payment;
  readonly mensaName: string;
  readonly now: Date;
  readonly onPress: () => void;
  readonly divider?: boolean;
}

/** One payment in a list: where, when, how much, and a status that never relies on colour alone. */
export function PaymentRow({ payment, mensaName, now, onPress, divider }: PaymentRowProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const { kind, label } = paymentStatus(payment, t, format);
  const when = whenText(payment.createdAt, now, t, format);
  return (
    <TransactionRow
      title={mensaName}
      subtitle={when}
      amount={format.debit(payment.amount)}
      struck={payment.status === 'declined'}
      tint={payment.priceGroup === 'staff' ? 'staff' : 'brand'}
      status={<StatusLabel kind={kind} label={label} />}
      accessibilityLabel={t('row.spoken', { mensa: mensaName, when, amount: format.moneySpoken(payment.amount), status: label })}
      onPress={onPress}
      divider={divider}
    />
  );
}

type T = ReturnType<typeof useTranslation>['t'];

function whenText(createdAt: string, now: Date, t: T, format: Format): string {
  const time = format.time(createdAt);
  const days = format.daysAgo(createdAt, now);
  if (days === 0) return t('home.today', { time });
  if (days === 1) return t('home.yesterday', { time });
  return format.dateTime(createdAt);
}
