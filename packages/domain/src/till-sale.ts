import type { Order } from './order';
import type { Payment } from './payment';
import { newer } from './versioned';

/** Why the till cannot say what happened to the payment right now. */
export type CheckingCause = 'connection' | 'review';

/**
 * One sale at the till, from the rung-up order to an outcome the server stated.
 *
 *   awaiting ─┬→ paid
 *     ↑  │    ├→ declined ──(show code again)──→ awaiting
 *     │  │    ├→ checking ──→ paid / declined / awaiting / expired
 *     │  │    └→ expired ──(new code: a new order)
 *     └──┴── checking (connection back, still open)
 *
 * The till never infers an outcome. "Paid" needs a confirmed payment for this
 * order. Zahln's API can't cancel an order, so the till can only set a sale
 * aside (see `canSetAside`); the order is then watched until it expires.
 */
export type TillSaleState =
  | { readonly step: 'awaiting'; readonly order: Order }
  /** The code ran out. `order.status` is `expired` once the server says so too. */
  | { readonly step: 'expired'; readonly order: Order }
  | { readonly step: 'checking'; readonly order: Order; readonly cause: CheckingCause; readonly payment?: Payment }
  | { readonly step: 'declined'; readonly order: Order; readonly payment: Payment }
  | { readonly step: 'paid'; readonly order: Order; readonly payment: Payment };

export type TillSaleEvent =
  /** A fresh read of the order, from polling. */
  | { readonly type: 'orderSeen'; readonly order: Order }
  /** The server's view of the payment for this order. */
  | { readonly type: 'paymentSeen'; readonly payment: Payment }
  /** The status check failed: the till can't tell what happened. */
  | { readonly type: 'statusUnavailable' }
  /** The order's `expiresAt` passed, in server time. */
  | { readonly type: 'qrExpired' }
  /** After a decline the same code can be paid again, until it expires. */
  | { readonly type: 'showCodeAgain' };

export function startSale(order: Order): TillSaleState {
  return { step: 'awaiting', order };
}

export function isSaleFinished(state: TillSaleState): boolean {
  return state.step === 'paid';
}

/** Nothing more can happen to the order: paid, or expired by the server's word. */
export function isSaleSettled(state: TillSaleState): boolean {
  return state.step === 'paid' || (state.step === 'expired' && state.order.status === 'expired');
}

/** The cashier may leave the sale only while no payment is in doubt. */
export function canSetAside(state: TillSaleState): boolean {
  return state.step === 'awaiting' || state.step === 'expired' || state.step === 'declined';
}

/** Pure transition. Invalid events return the same state object. */
export function tillSaleTransition(state: TillSaleState, event: TillSaleEvent): TillSaleState {
  if (state.step === 'paid') return state;
  switch (event.type) {
    case 'paymentSeen':
      return onPayment(state, event.payment);
    case 'orderSeen':
      return onOrder(state, event.order);
    case 'statusUnavailable':
      return state.step === 'awaiting' ? { step: 'checking', order: state.order, cause: 'connection' } : state;
    case 'qrExpired':
      return state.step === 'awaiting' || state.step === 'declined' ? { step: 'expired', order: state.order } : state;
    case 'showCodeAgain':
      return state.step === 'declined' && state.order.status === 'open' ? { step: 'awaiting', order: state.order } : state;
  }
}

function onOrder(state: Exclude<TillSaleState, { step: 'paid' }>, incoming: Order): TillSaleState {
  if (incoming.id !== state.order.id) return state;
  const order = newer(state.order, incoming);
  // Any answer ends a connection doubt, even one that shows nothing new.
  const reconnected = state.step === 'checking' && state.cause === 'connection';
  if (order === state.order && !reconnected) return state;
  const payment = state.step === 'checking' ? state.payment : undefined;
  switch (order.status) {
    case 'expired':
      // A payment still being checked decides the sale, not the clock.
      return payment ? { step: 'checking', order, cause: 'review', payment } : { step: 'expired', order };
    case 'paying':
    case 'paid':
      // The payment is read next: "paid" is only shown with the confirmed payment.
      return payment ? { step: 'checking', order, cause: 'review', payment } : { step: 'checking', order, cause: 'review' };
    case 'open':
      return state.step === 'checking' && !payment ? { step: 'awaiting', order } : { ...state, order };
  }
}

function onPayment(state: Exclude<TillSaleState, { step: 'paid' }>, incoming: Payment): TillSaleState {
  if (incoming.orderId !== state.order.id) return state;
  const known = 'payment' in state && state.payment?.id === incoming.id ? state.payment : undefined;
  const payment = newer(known, incoming);
  if (known && payment === known) return state;
  switch (payment.status) {
    case 'confirmed':
      return { step: 'paid', order: state.order, payment };
    case 'declined':
      // A decline only matters if it is news: the order is open for another try.
      if (state.step === 'declined' && state.payment.id === payment.id) return state;
      if (state.order.status === 'expired') return { step: 'expired', order: state.order };
      return { step: 'declined', order: state.order, payment };
    case 'pending':
      return { step: 'checking', order: state.order, cause: 'review', payment };
  }
}
