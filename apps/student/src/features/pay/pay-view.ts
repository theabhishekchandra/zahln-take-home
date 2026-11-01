import type { NotPaidReason, OrderCodeProblem } from '@zahln/domain';

/** Problems with the code itself; shown as a sheet over the scanner (design screen 13). */
export type QrProblem = 'expired' | 'alreadyPaid' | 'notFound' | OrderCodeProblem;

const QR_PROBLEMS: Partial<Record<NotPaidReason, QrProblem>> = {
  quote_expired: 'expired',
  order_already_paid: 'alreadyPaid',
  order_not_found: 'notFound',
};

/** The sheet to show over the scanner when the server refused the scanned order, if any. */
export function qrProblemFor(reason: NotPaidReason): QrProblem | null {
  return QR_PROBLEMS[reason] ?? null;
}
