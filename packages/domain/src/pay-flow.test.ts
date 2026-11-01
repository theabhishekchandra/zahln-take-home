import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { intent, payment, quote } from './__fixtures__';
import { asOrderId, asPaymentId } from './ids';
import {
  initialPayFlowState,
  isPaymentInFlight,
  transition,
  type PayFlowEvent,
  type PayFlowState,
} from './pay-flow';

const run = (events: PayFlowEvent[], from: PayFlowState = initialPayFlowState) => events.reduce(transition, from);

const toSubmitting: PayFlowEvent[] = [
  { type: 'scanned', orderRef: { orderId: quote.orderId } },
  { type: 'quoteLoaded', quote },
  { type: 'confirmRequested' },
  { type: 'authorized', intent },
];

describe('pay flow: happy path', () => {
  it('goes from scan to confirmed only on a confirmed payment from the server', () => {
    const submitting = run(toSubmitting);
    expect(submitting.step).toBe('submitting');
    const confirmed = transition(submitting, { type: 'paymentUpdated', payment: payment('confirmed', 2) });
    expect(confirmed).toMatchObject({ step: 'confirmed', payment: { status: 'confirmed' } });
  });

  it('returns to review when biometrics are cancelled', () => {
    const state = run([...toSubmitting.slice(0, 3), { type: 'authorizationCancelled' }]);
    expect(state).toEqual({ step: 'reviewing', quote });
  });

  it('ignores a quote for a different order', () => {
    const loading = run(toSubmitting.slice(0, 1));
    const other = { ...quote, orderId: 'order-2' as typeof quote.orderId };
    expect(transition(loading, { type: 'quoteLoaded', quote: other })).toBe(loading);
  });

  it('ignores an authorization for a different order', () => {
    const authorizing = run(toSubmitting.slice(0, 3));
    const other = { ...intent, quote: { ...quote, orderId: asOrderId('ord_2') } };
    expect(transition(authorizing, { type: 'authorized', intent: other })).toBe(authorizing);
  });
});

describe('pay flow: when things go wrong', () => {
  it('a lost response leads to verifying, never to a failure', () => {
    const state = run([...toSubmitting, { type: 'outcomeUnknown' }]);
    expect(state).toEqual({ step: 'verifying', intent });
  });

  it('cannot be reset while money may be moving', () => {
    const submitting = run(toSubmitting);
    expect(transition(submitting, { type: 'reset' })).toBe(submitting);
    const verifying = transition(submitting, { type: 'outcomeUnknown' });
    expect(transition(verifying, { type: 'reset' })).toBe(verifying);
  });

  it('stays verifying while the server reports the payment pending', () => {
    const verifying = run([...toSubmitting, { type: 'paymentUpdated', payment: payment('pending', 2) }]);
    expect(verifying).toMatchObject({ step: 'verifying', payment: { status: 'pending' } });
  });

  it('discards an older response that arrives after a newer one', () => {
    const verifying = run([...toSubmitting, { type: 'paymentUpdated', payment: payment('pending', 3) }]);
    expect(transition(verifying, { type: 'paymentUpdated', payment: payment('pending', 2) })).toBe(verifying);
  });

  it('ignores a payment for another order, and once one is known, any other payment', () => {
    const submitting = run(toSubmitting);
    const foreign = payment('confirmed', 2, { orderId: asOrderId('ord_other') });
    expect(transition(submitting, { type: 'paymentUpdated', payment: foreign })).toBe(submitting);
    const verifying = transition(submitting, { type: 'paymentUpdated', payment: payment('pending', 1) });
    const earlier = payment('confirmed', 3, { id: asPaymentId('pay_earlier') });
    expect(transition(verifying, { type: 'paymentUpdated', payment: earlier })).toBe(verifying);
  });

  it('resumes a saved intent as verifying after an app restart', () => {
    expect(transition(initialPayFlowState, { type: 'resumed', intent })).toEqual({ step: 'verifying', intent });
  });
});

// ── Properties: hold for every possible sequence of events ─────────────────

const eventArb: fc.Arbitrary<PayFlowEvent> = fc.oneof(
  fc.constant<PayFlowEvent>({ type: 'scanned', orderRef: { orderId: quote.orderId } }),
  fc.constant<PayFlowEvent>({ type: 'resumed', intent }),
  fc.constant<PayFlowEvent>({ type: 'quoteLoaded', quote }),
  fc.constant<PayFlowEvent>({ type: 'quoteFailed', reason: 'quote_unavailable' }),
  fc.constant<PayFlowEvent>({ type: 'confirmRequested' }),
  fc.constant<PayFlowEvent>({ type: 'authorized', intent }),
  fc.constant<PayFlowEvent>({ type: 'authorizationCancelled' }),
  fc.constant<PayFlowEvent>({ type: 'submitRejected', reason: 'rejected' }),
  fc.constant<PayFlowEvent>({ type: 'outcomeUnknown' }),
  fc.constant<PayFlowEvent>({ type: 'reset' }),
  fc
    .record({
      status: fc.constantFrom('pending', 'confirmed', 'declined' as const),
      version: fc.integer({ min: 1, max: 5 }),
      order: fc.constantFrom(quote.orderId, asOrderId('ord_other')),
      id: fc.constantFrom('pay_1', 'pay_2'),
    })
    .map(({ status, version, order, id }): PayFlowEvent => ({
      type: 'paymentUpdated',
      payment: payment(status, version, { orderId: order, id: asPaymentId(id) }),
    })),
);

describe('pay flow: invariants', () => {
  it("only reaches confirmed through a confirmed payment for its own order, and the payment it was already following", () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 40 }), (events) => {
        let state = initialPayFlowState;
        for (const event of events) {
          const next = transition(state, event);
          if (next.step === 'confirmed' && state.step !== 'confirmed') {
            expect(event.type).toBe('paymentUpdated');
            expect(next.payment.status).toBe('confirmed');
            expect(next.payment.orderId).toBe(next.intent.quote.orderId);
            if (state.step === 'verifying' && state.payment) expect(next.payment.id).toBe(state.payment.id);
          }
          state = next;
        }
      }),
    );
  });

  it('never abandons a payment in flight: it only leaves to a stated outcome', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 40 }), (events) => {
        let state = initialPayFlowState;
        for (const event of events) {
          const next = transition(state, event);
          if (isPaymentInFlight(state) && !isPaymentInFlight(next)) {
            expect(['confirmed', 'declined', 'notPaid']).toContain(next.step);
            if (next.step === 'notPaid') expect(event.type).toBe('submitRejected');
            if (next.step !== 'notPaid') expect(event.type).toBe('paymentUpdated');
          }
          state = next;
        }
      }),
    );
  });

  it('never moves to an older version of the payment while verifying', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 40 }), (events) => {
        let state = initialPayFlowState;
        for (const event of events) {
          const next = transition(state, event);
          if (state.step === 'verifying' && state.payment && 'payment' in next && next.payment) {
            expect(next.payment.version).toBeGreaterThanOrEqual(state.payment.version);
          }
          state = next;
        }
      }),
    );
  });
});
