import type { IdempotencyKey, RefundId } from './ids';
import type { Money } from './money';
import { newerPayment, type Payment } from './payment';
import { draftAmount, draftProblem, type Refund, type RefundDraft, type RefundReason, type RefundRefusal } from './refund';

/** One refund attempt as sent. Its key never changes, so re-sending it can never refund twice. */
export interface RefundAttempt {
  readonly amount: Money;
  readonly reason: RefundReason;
  readonly idempotencyKey: IdempotencyKey;
  /** Known once the server has answered; its status is then read from the payment. */
  readonly refundId?: RefundId;
}

/**
 * Refunding one payment at the till. "Refunded" is reached only through a
 * refund the server completed for this attempt.
 */
export type RefundFlowState =
  | { readonly step: 'editing'; readonly payment: Payment; readonly draft: RefundDraft; readonly refusal: { readonly reason: RefundRefusal; readonly amount: Money } | null }
  | { readonly step: 'submitting'; readonly payment: Payment; readonly draft: RefundDraft; readonly attempt: RefundAttempt }
  /**
   * No answer yet (the same attempt is sent again, with its key, until one
   * comes), or the refund is pending (its status is read until it settles).
   */
  | { readonly step: 'checking'; readonly payment: Payment; readonly draft: RefundDraft; readonly attempt: RefundAttempt }
  | { readonly step: 'refunded'; readonly payment: Payment; readonly refund: Refund };

export type RefundFlowEvent =
  | { readonly type: 'edit'; readonly draft: RefundDraft }
  | { readonly type: 'submit'; readonly idempotencyKey: IdempotencyKey }
  | { readonly type: 'refundSeen'; readonly refund: Refund }
  | { readonly type: 'refused'; readonly reason: RefundRefusal }
  /** Provably not applied (offline, busy): back to editing, nothing happened. */
  | { readonly type: 'notSent' }
  | { readonly type: 'outcomeUnknown' }
  /** A fresh copy of the payment from the server. */
  | { readonly type: 'paymentSeen'; readonly payment: Payment };

export function startRefund(payment: Payment, draft: RefundDraft): RefundFlowState {
  return { step: 'editing', payment, draft, refusal: null };
}

export function refundFlowTransition(state: RefundFlowState, event: RefundFlowEvent): RefundFlowState {
  if (event.type === 'paymentSeen') {
    if (event.payment.id !== state.payment.id) return state;
    const payment = newerPayment(state.payment, event.payment);
    return payment === state.payment ? state : { ...state, payment };
  }
  switch (state.step) {
    case 'editing': {
      if (event.type === 'edit') return { ...state, draft: event.draft, refusal: null };
      if (event.type !== 'submit' || draftProblem(state.draft, state.payment)) return state;
      const amount = draftAmount(state.draft, state.payment);
      if (!amount || !state.draft.reason) return state;
      return {
        step: 'submitting',
        payment: state.payment,
        draft: state.draft,
        attempt: { amount, reason: state.draft.reason, idempotencyKey: event.idempotencyKey },
      };
    }
    case 'submitting':
    case 'checking': {
      if (event.type === 'refundSeen') {
        const { refund } = event;
        // The first answer names the refund; after that only that refund counts.
        const known = state.attempt.refundId;
        if ((known && refund.id !== known) || refund.paymentId !== state.payment.id) return state;
        if (refund.status === 'completed') return { step: 'refunded', payment: state.payment, refund };
        if (refund.status === 'failed') return editingAfterRefusal(state, 'failed');
        return { ...state, step: 'checking', attempt: { ...state.attempt, refundId: refund.id } };
      }
      if (event.type === 'refused') return editingAfterRefusal(state, event.reason);
      if (event.type === 'outcomeUnknown') return { ...state, step: 'checking' };
      // While checking, "not sent" only means this re-check didn't get through; the first may have.
      if (event.type === 'notSent' && state.step === 'submitting') return { step: 'editing', payment: state.payment, draft: state.draft, refusal: null };
      return state;
    }
    case 'refunded':
      return state;
  }
}

function editingAfterRefusal(state: Extract<RefundFlowState, { attempt: RefundAttempt }>, reason: RefundRefusal): RefundFlowState {
  return { step: 'editing', payment: state.payment, draft: state.draft, refusal: { reason, amount: state.attempt.amount } };
}
