import type { PaymentId, RefundId } from './ids';
import { isPositive, parseMoneyInput, type Money } from './money';
import { refundableAmount, type Payment } from './payment';

/** pending: being processed, usually for seconds. completed: money went back. failed: it did not. */
export type RefundStatus = 'pending' | 'completed' | 'failed';

/** Why the cashier gives money back. Kept with the refund for the mensa's records. */
export const REFUND_REASONS = ['wrong_dish', 'charged_twice', 'quality'] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

export interface Refund {
  readonly id: RefundId;
  readonly paymentId: PaymentId;
  readonly amount: Money;
  /** Free text on the server; the till sends one of `REFUND_REASONS`. */
  readonly reason: string | null;
  readonly status: RefundStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Why the server refused a refund, in the till's words (design T11). The till
 * never applies these rules itself; it shows the reason the server gives.
 */
export type RefundRefusal =
  | 'exceeds_remaining'
  | 'fully_refunded'
  | 'being_checked'
  /** Everything left is already in refunds still being processed. */
  | 'refund_pending'
  | 'declined'
  | 'window_closed'
  /** The server accepted the refund, then it failed. No money went back. */
  | 'failed'
  /** Any other refusal: said plainly, without guessing a rule. */
  | 'not_allowed';

/**
 * Zahln's refusal codes. `payment_not_refundable` covers several causes; the
 * till refreshes the payment and `refundBlockedBy` then names the cause.
 */
const REFUSALS: Readonly<Record<string, RefundRefusal>> = {
  refund_exceeds_payment: 'exceeds_remaining',
  refund_window_closed: 'window_closed',
};

export function refundRefusalFor(code: string | undefined): RefundRefusal {
  return (code && REFUSALS[code]) || 'not_allowed';
}

/**
 * What the server's own status of a payment already says about refunding it,
 * so the till doesn't offer a refund the server has told it cannot happen.
 */
export function refundBlockedBy(payment: Payment): RefundRefusal | null {
  if (payment.status === 'declined') return 'declined';
  if (payment.status !== 'confirmed') return 'being_checked';
  if (isPositive(refundableAmount(payment))) return null;
  return isPositive(payment.refundPending) ? 'refund_pending' : 'fully_refunded';
}

export interface RefundDraft {
  /** Full gives back everything still refundable; partial the typed amount. */
  readonly mode: 'full' | 'partial';
  readonly amountText: string;
  readonly reason: RefundReason | null;
}

export const emptyRefundDraft: RefundDraft = { mode: 'partial', amountText: '', reason: null };

/** The amount the draft asks for, or null if none can be read from it. */
export function draftAmount(draft: RefundDraft, payment: Payment): Money | null {
  if (draft.mode === 'full') return refundableAmount(payment);
  const amount = parseMoneyInput(draft.amountText, payment.amount.currency);
  return amount && isPositive(amount) ? amount : null;
}

/** What is missing before the draft can be sent. Limits are the server's to enforce. */
export type DraftProblem = 'no_amount' | 'no_reason';

export function draftProblem(draft: RefundDraft, payment: Payment): DraftProblem | null {
  if (!draftAmount(draft, payment)) return 'no_amount';
  if (!draft.reason) return 'no_reason';
  return null;
}
