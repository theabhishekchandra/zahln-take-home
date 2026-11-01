import type { Money, Payment } from '@zahln/domain';
import type { Format, useTranslation } from '@zahln/i18n';

import { paymentStatus } from '@/lib/payment-status';

type T = ReturnType<typeof useTranslation>['t'];

/** Does a payment match what was typed in the search box: its mensa, till, amount or ID. */
export function matchesSearch(payment: Payment, query: string, format: Format): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const amount = format.money(payment.amount);
  // "2.50", "2,50" and "€2.50" all find €2.50, whichever separator the language uses.
  const digits = (text: string) => text.replace(/[^\d]/g, '');
  const haystack = [payment.mensa.name, payment.till.name, amount, payment.id, payment.orderId].join(' ').toLowerCase();
  const typed = digits(needle);
  return haystack.includes(needle) || (typed !== '' && digits(amount).includes(typed));
}

/** The month as plain text, for "Share statement": every payment with its state, then what was spent. */
export function statementText(month: Date, payments: readonly Payment[], spent: Money, t: T, format: Format): string {
  const lines = payments.map(
    (payment) =>
      `${format.dateTime(payment.createdAt)}  ${payment.mensa.name} · ${payment.till.name}  ${format.debit(payment.amount)}  ${paymentStatus(payment, t, format).label}`,
  );
  return [
    t('activity.statementTitle', { month: format.month(month) }),
    '',
    ...lines,
    '',
    `${t('home.spentIn', { month: format.month(month) })}: ${format.money(spent)}`,
  ].join('\n');
}
