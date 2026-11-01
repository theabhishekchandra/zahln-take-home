import type { Payment } from '@zahln/domain';
import type { PillTone } from '@zahln/ui-web';

export type PaymentLabel = 'paid' | 'unknown' | 'declined' | 'refunded' | 'partlyRefunded' | 'refundFailed' | 'refundPending';

/**
 * How the dashboard names a payment's state. Only a confirmed payment is ever
 * "paid"; one still being checked says so, in its own colour.
 */
export function paymentLabel(payment: Payment): { readonly label: PaymentLabel; readonly tone: PillTone } {
  if (payment.status === 'pending') return { label: 'unknown', tone: 'pending' };
  if (payment.status === 'declined') return { label: 'declined', tone: 'danger' };
  if (payment.attentionReasons.includes('refund_failed')) return { label: 'refundFailed', tone: 'danger' };
  if (payment.refundPending.cents > 0) return { label: 'refundPending', tone: 'pending' };
  if (payment.refunded.cents >= payment.amount.cents) return { label: 'refunded', tone: 'neutral' };
  if (payment.refunded.cents > 0) return { label: 'partlyRefunded', tone: 'neutral' };
  return { label: 'paid', tone: 'success' };
}
