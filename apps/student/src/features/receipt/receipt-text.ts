import type { PaymentDetail } from '@zahln/domain';
import type { Format, useTranslation } from '@zahln/i18n';

type T = ReturnType<typeof useTranslation>['t'];

/** The receipt as plain text, for "Share as text". Names the state as the screen does. */
export function receiptText(payment: PaymentDetail, status: string, t: T, format: Format): string {
  const lines = payment.items.map((item) => `${item.quantity}× ${format.text(item.name)}  ${format.money({ ...item.unitPrice, cents: item.unitPrice.cents * item.quantity })}`);
  return [
    t('receipt.shareTitle'),
    `${payment.mensa.name} · ${payment.till.name}`,
    format.dateTime(payment.createdAt),
    '',
    ...lines,
    `${t('receipt.total')}: ${format.money(payment.amount)}`,
    payment.refunded.cents > 0 ? `${t('receipt.refunds')}: ${format.debit(payment.refunded)}` : null,
    status,
    '',
    `${t('receipt.paymentId')}: ${payment.id}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}
