import type { Payment } from './payment';

/**
 * The till's search over today's payments: by amount ("4.60", "4,6"), time
 * ("11:36") or payment ID ("7b88"). `localTime` gives "HH:mm" in the till's zone.
 */
export function matchesPaymentSearch(payment: Payment, query: string, localTime: (iso: string) => string): boolean {
  const text = query.trim().toLowerCase().replace(/^€\s*/, '');
  if (!text) return true;
  if (payment.id.toLowerCase().includes(text)) return true;
  if (localTime(payment.createdAt).startsWith(text)) return true;
  const amount = text.replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(amount)) return false;
  const [whole, fraction = ''] = (payment.amount.cents / 100).toFixed(2).split('.');
  const [qWhole, qFraction] = amount.split('.');
  if (qWhole !== whole) return false;
  return qFraction === undefined || fraction.startsWith(qFraction);
}
