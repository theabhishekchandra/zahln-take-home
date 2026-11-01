import type { AttentionReason, Payment } from '@zahln/domain';

const ORDER: readonly AttentionReason[] = ['refund_failed', 'pending_too_long', 'refund_pending_too_long'];

/** The reason a payment is shown under: a failed refund before a long-pending payment or refund. */
export function mainReason(payment: Payment): AttentionReason {
  return ORDER.find((reason) => payment.attentionReasons.includes(reason)) ?? 'pending_too_long';
}

/** Every reason Zahln gives, most serious first. */
export function reasonsInOrder(payment: Payment): readonly AttentionReason[] {
  return ORDER.filter((reason) => payment.attentionReasons.includes(reason));
}

export interface ReasonLook {
  /** The glyph in the reason's tile; decorative, the title says it in words. */
  readonly icon: string;
  readonly tone: 'pending' | 'danger';
  /** A slow refund can wait; money in doubt or not given back can't. */
  readonly severity: 'high' | 'medium';
}

const LOOKS: Readonly<Record<AttentionReason, ReasonLook>> = {
  pending_too_long: { icon: '?', tone: 'pending', severity: 'high' },
  refund_failed: { icon: '!', tone: 'danger', severity: 'high' },
  refund_pending_too_long: { icon: '…', tone: 'pending', severity: 'medium' },
};

export const reasonLook = (reason: AttentionReason): ReasonLook => LOOKS[reason];
