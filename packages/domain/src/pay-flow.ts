import { isQuoteExpired, type OrderRef, type Quote } from './order';
import { newerPayment, type Payment } from './payment';
import type { PaymentIntent } from './payment-intent';

/** Why a payment did not happen. Each reason guarantees that no money moved. */
export type NotPaidReason =
  | 'order_not_found'
  | 'order_already_paid'
  /** Someone else's payment for this order is being checked. */
  | 'payment_in_progress'
  | 'quote_expired'
  | 'quote_unavailable'
  /** The price the student saw is no longer the order's price. */
  | 'price_changed'
  | 'payments_disabled'
  /** This app version is too old to pay; it must be updated. */
  | 'update_required'
  | 'offline'
  | 'session_expired'
  | 'server_busy'
  | 'rejected';

/**
 * The student's pay flow, from scanning the till's QR to a result that is true.
 *
 *   idle → loadingQuote → reviewing → authorizing → submitting ─┬→ confirmed
 *                │                         │            │       ├→ declined
 *                └→ notPaid                └→ reviewing └→ verifying ─┘ (or notPaid if
 *                                                                        provably rejected)
 *
 * Once a payment is submitting or verifying, money may be moving. From there the
 * flow can only end in an outcome the server has stated; it cannot be reset or
 * abandoned, and a lost response leads to "verifying", never to "failed".
 */
export type PayFlowState =
  | { readonly step: 'idle' }
  | { readonly step: 'loadingQuote'; readonly orderRef: OrderRef }
  | { readonly step: 'reviewing'; readonly quote: Quote }
  | { readonly step: 'authorizing'; readonly quote: Quote }
  | { readonly step: 'submitting'; readonly intent: PaymentIntent }
  | { readonly step: 'verifying'; readonly intent: PaymentIntent; readonly payment?: Payment }
  | { readonly step: 'confirmed'; readonly intent: PaymentIntent; readonly payment: Payment }
  | { readonly step: 'declined'; readonly intent: PaymentIntent; readonly payment: Payment }
  | { readonly step: 'notPaid'; readonly reason: NotPaidReason };

export type PayFlowEvent =
  | { readonly type: 'scanned'; readonly orderRef: OrderRef }
  /** App restarted with a saved intent whose outcome is not known yet. */
  | { readonly type: 'resumed'; readonly intent: PaymentIntent }
  | { readonly type: 'quoteLoaded'; readonly quote: Quote }
  | { readonly type: 'quoteFailed'; readonly reason: NotPaidReason }
  /** The code's timer ran out while the student was still reviewing. Nothing was sent. */
  | { readonly type: 'quoteExpired' }
  | { readonly type: 'confirmRequested' }
  | { readonly type: 'authorized'; readonly intent: PaymentIntent }
  | { readonly type: 'authorizationCancelled' }
  /** The server provably did not process the payment (it refused before processing). */
  | { readonly type: 'submitRejected'; readonly reason: NotPaidReason }
  /** Timeout, dropped connection or unreadable response: the payment may or may not exist. */
  | { readonly type: 'outcomeUnknown' }
  /** Any view of the payment from the server: a submit response, a status check or a push. */
  | { readonly type: 'paymentUpdated'; readonly payment: Payment }
  | { readonly type: 'reset' };

export const initialPayFlowState: PayFlowState = { step: 'idle' };

type AwaitingOutcome = Extract<PayFlowState, { step: 'submitting' | 'verifying' }>;

/**
 * Pure transition function. Events that are not valid in the current state are
 * ignored and the same state object is returned, so callers can detect a no-op
 * with `===`.
 */
export function transition(state: PayFlowState, event: PayFlowEvent): PayFlowState {
  switch (state.step) {
    case 'idle':
      if (event.type === 'scanned') return { step: 'loadingQuote', orderRef: event.orderRef };
      if (event.type === 'resumed') return { step: 'verifying', intent: event.intent };
      return state;

    case 'loadingQuote':
      if (event.type === 'quoteLoaded' && event.quote.orderId === state.orderRef.orderId) {
        return { step: 'reviewing', quote: event.quote };
      }
      if (event.type === 'quoteFailed') return { step: 'notPaid', reason: event.reason };
      if (event.type === 'reset') return initialPayFlowState;
      return state;

    case 'reviewing':
      if (event.type === 'confirmRequested') return { step: 'authorizing', quote: state.quote };
      if (event.type === 'quoteExpired') return { step: 'notPaid', reason: 'quote_expired' };
      if (event.type === 'reset') return initialPayFlowState;
      return state;

    case 'authorizing':
      if (event.type === 'authorized' && event.intent.quote.orderId === state.quote.orderId) {
        return { step: 'submitting', intent: event.intent };
      }
      if (event.type === 'authorizationCancelled') return { step: 'reviewing', quote: state.quote };
      return state;

    case 'submitting':
    case 'verifying':
      return awaitOutcome(state, event);

    case 'confirmed':
    case 'declined':
    case 'notPaid':
      return event.type === 'reset' ? initialPayFlowState : state;
  }
}

function awaitOutcome(state: AwaitingOutcome, event: PayFlowEvent): PayFlowState {
  switch (event.type) {
    case 'paymentUpdated': {
      // The payment comes from replaying this intent's key or reading its ID,
      // so it is this intent's payment if it is for the same order and, once
      // one is known, has the same ID.
      const incoming = event.payment;
      if (incoming.orderId !== state.intent.quote.orderId) return state;
      const known = state.step === 'verifying' ? state.payment : undefined;
      if (known && known.id !== incoming.id) return state;

      const payment = newerPayment(known, incoming);
      if (payment.status === 'confirmed') return { step: 'confirmed', intent: state.intent, payment };
      if (payment.status === 'declined') return { step: 'declined', intent: state.intent, payment };
      if (state.step === 'verifying' && payment === known) return state;
      return { step: 'verifying', intent: state.intent, payment };
    }
    case 'outcomeUnknown':
      return state.step === 'verifying' ? state : { step: 'verifying', intent: state.intent };
    case 'submitRejected':
      return { step: 'notPaid', reason: event.reason };
    default:
      // Deliberately no 'reset': a payment whose outcome is unknown cannot be abandoned.
      return state;
  }
}

/** True while money may be moving. Screens must not let the user leave or retry. */
export function isPaymentInFlight(state: PayFlowState): state is AwaitingOutcome {
  return state.step === 'submitting' || state.step === 'verifying';
}

/**
 * Why a freshly read order can't be paid, if it can't. `serverNow` is the
 * server's time (from its `Date` header), never the device clock.
 */
export function quoteProblem(quote: Quote, serverNow: Date): NotPaidReason | null {
  switch (quote.status) {
    case 'paid':
      return 'order_already_paid';
    case 'paying':
      return 'payment_in_progress';
    case 'expired':
      return 'quote_expired';
    case 'open':
      return isQuoteExpired(quote, serverNow) ? 'quote_expired' : null;
  }
}
