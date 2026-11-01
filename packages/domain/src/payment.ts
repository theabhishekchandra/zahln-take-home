import type { MensaId, OrderId, PaymentId, RefundId, TillId, UserId } from './ids';
import { subtractMoney, zero, type Money } from './money';
import type { LocalizedText, Ref } from './order';
import type { PriceGroup } from './pricing';
import type { Refund } from './refund';
import { newer } from './versioned';

/**
 * Server-side status of a payment.
 * - pending:   still being checked; usually seconds, sometimes minutes
 * - confirmed: the payer has paid
 * - declined:  money did not move, and never will for this payment
 */
export type PaymentStatus = 'pending' | 'confirmed' | 'declined';

/** Why finance should look at a payment. */
export type AttentionReason = 'pending_too_long' | 'refund_pending_too_long' | 'refund_failed';

export interface PaymentItem {
  readonly itemId: string;
  readonly name: LocalizedText;
  readonly quantity: number;
  readonly unitPrice: Money;
}

export interface Payer {
  readonly id: UserId;
  readonly name: string;
}

export interface Payment {
  readonly id: PaymentId;
  readonly orderId: OrderId;
  readonly status: PaymentStatus;
  readonly amount: Money;
  readonly priceGroup: PriceGroup;
  readonly mensa: Ref<MensaId>;
  readonly till: Ref<TillId>;
  readonly payer: Payer;
  readonly items: readonly PaymentItem[];
  /** Sum of completed refunds. */
  readonly refunded: Money;
  /** Sum of refunds still being processed. */
  readonly refundPending: Money;
  /** What can still be refunded now, as the server counts it. */
  readonly refundable: Money;
  readonly needsAttention: boolean;
  readonly attentionReasons: readonly AttentionReason[];
  /** Increases with every server-side change. Used to discard stale or out-of-order responses. */
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type PaymentEventType =
  | 'payment_created'
  | 'payment_confirmed'
  | 'payment_declined'
  | 'refund_requested'
  | 'refund_completed'
  | 'refund_failed';

export interface PaymentEvent {
  readonly at: string;
  readonly type: PaymentEventType;
  readonly amount: Money | null;
  readonly refundId: RefundId | null;
}

/** A payment with its refunds and every state change, oldest first. */
export interface PaymentDetail extends Payment {
  readonly refunds: readonly Refund[];
  readonly history: readonly PaymentEvent[];
}

/** True once the outcome can no longer change between "money moved" and "money did not move". */
export function isSettled(status: PaymentStatus): status is 'confirmed' | 'declined' {
  return status === 'confirmed' || status === 'declined';
}

/** Keeps whichever view of a payment is newer (see `newer`). */
export function newerPayment<P extends Payment>(current: P | undefined, incoming: P): P {
  return newer(current, incoming);
}

/** What the payer is out of pocket: a confirmed amount less completed refunds; nothing for any other status. */
export function netPaid(payment: Payment): Money {
  if (payment.status !== 'confirmed') return zero(payment.amount.currency);
  return subtractMoney(payment.amount, payment.refunded);
}

/** How much can still be refunded. The server counts pending refunds; only confirmed payments qualify. */
export function refundableAmount(payment: Payment): Money {
  if (payment.status !== 'confirmed' || payment.refundable.cents < 0) return zero(payment.amount.currency);
  return payment.refundable;
}

/** Where a payment stands, as both the student and the till show it. */
export type PaymentStanding = 'paid' | 'partly_refunded' | 'refunded' | 'checking' | 'declined';

export function paymentStanding(payment: Payment): PaymentStanding {
  if (payment.status === 'declined') return 'declined';
  if (payment.status !== 'confirmed') return 'checking';
  if (payment.refunded.cents === 0) return 'paid';
  return netPaid(payment).cents <= 0 ? 'refunded' : 'partly_refunded';
}
