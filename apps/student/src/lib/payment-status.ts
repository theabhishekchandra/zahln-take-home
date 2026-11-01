import { paymentStanding, type Payment } from '@zahln/domain';
import type { Format, useTranslation } from '@zahln/i18n';
import type { StatusKind } from '@zahln/ui-native';

type T = ReturnType<typeof useTranslation>['t'];

/** How the payer's app names a payment's state, in a list and on the receipt. Only confirmed is ever "paid". */
export function paymentStatus(payment: Payment, t: T, format: Format): { readonly kind: StatusKind; readonly label: string } {
  switch (paymentStanding(payment)) {
    case 'checking':
      return { kind: 'checking', label: t('status.checking') };
    case 'declined':
      return { kind: 'declined', label: t('status.declined') };
    case 'paid':
      return { kind: 'paid', label: t('status.paid') };
    case 'refunded':
      return { kind: 'refunded', label: t('status.refunded') };
    case 'partly_refunded':
      return { kind: 'refunded', label: t('status.partlyRefunded', { amount: format.money(payment.refunded) }) };
  }
}
