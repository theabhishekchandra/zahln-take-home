import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { payment } from './__fixtures__';
import { asIdempotencyKey, asRefundId } from './ids';
import { money, parseMoneyInput } from './money';
import type { Payment } from './payment';
import { matchesPaymentSearch } from './payment-search';
import { draftAmount, draftProblem, refundBlockedBy, refundRefusalFor, type Refund, type RefundDraft } from './refund';
import { refundFlowTransition, startRefund, type RefundFlowEvent, type RefundFlowState } from './refund-flow';

const paid: Payment = payment('confirmed', 1, { amount: money(460), refunded: money(100), refundable: money(360) });
const draft: RefundDraft = { mode: 'partial', amountText: '2,00', reason: 'wrong_dish' };
const key = asIdempotencyKey('refund-key-1');
const refund = (status: Refund['status'], id = 'ref_1'): Refund => ({
  id: asRefundId(id),
  paymentId: paid.id,
  amount: money(200),
  reason: 'wrong_dish',
  status,
  createdAt: '2026-10-30T12:20:00.000Z',
  updatedAt: '2026-10-30T12:20:00.000Z',
});
const run = (events: RefundFlowEvent[], from: RefundFlowState = startRefund(paid, draft)) => events.reduce(refundFlowTransition, from);

describe('parseMoneyInput', () => {
  it.each([
    ['2', 200],
    ['2.5', 250],
    ['2,50', 250],
    ['€ 3.60', 360],
    ['0.05', 5],
  ])('reads %s', (text, cents) => expect(parseMoneyInput(text)).toEqual(money(cents)));

  it.each(['', '-1', '2.505', '1e3', 'abc', '2.', '.5'])('refuses %s', (text) => expect(parseMoneyInput(text)).toBeNull());
});

describe('refund draft', () => {
  it('full refunds everything still refundable; partial the typed amount', () => {
    expect(draftAmount({ ...draft, mode: 'full' }, paid)).toEqual(money(360));
    expect(draftAmount(draft, paid)).toEqual(money(200));
  });

  it('needs an amount and a reason, and leaves limits to the server', () => {
    expect(draftProblem({ ...draft, amountText: '0' }, paid)).toBe('no_amount');
    expect(draftProblem({ ...draft, reason: null }, paid)).toBe('no_reason');
    expect(draftProblem({ ...draft, amountText: '9.00' }, paid)).toBeNull();
  });

  it('says what the payment status already rules out', () => {
    expect(refundBlockedBy(paid)).toBeNull();
    expect(refundBlockedBy({ ...paid, refunded: money(460), refundable: money(0) })).toBe('fully_refunded');
    expect(refundBlockedBy({ ...paid, refundPending: money(360), refundable: money(0) })).toBe('refund_pending');
    expect(refundBlockedBy(payment('declined', 1))).toBe('declined');
    expect(refundBlockedBy(payment('pending', 1))).toBe('being_checked');
  });

  it("maps Zahln's codes to the till's reasons, and anything else to a plain refusal", () => {
    expect(refundRefusalFor('refund_exceeds_payment')).toBe('exceeds_remaining');
    expect(refundRefusalFor('refund_window_closed')).toBe('window_closed');
    expect(refundRefusalFor('payment_not_refundable')).toBe('not_allowed');
    expect(refundRefusalFor('something_new')).toBe('not_allowed');
    expect(refundRefusalFor(undefined)).toBe('not_allowed');
  });
});

describe('refund flow', () => {
  it('is refunded only when the server confirms this attempt', () => {
    const submitting = run([{ type: 'submit', idempotencyKey: key }]);
    expect(submitting).toMatchObject({ step: 'submitting', attempt: { amount: money(200), reason: 'wrong_dish', idempotencyKey: key } });
    const otherPayment = { ...refund('completed'), paymentId: 'pay_other' as Refund['paymentId'] };
    expect(refundFlowTransition(submitting, { type: 'refundSeen', refund: otherPayment })).toBe(submitting);
    expect(refundFlowTransition(submitting, { type: 'refundSeen', refund: refund('completed') })).toMatchObject({ step: 'refunded' });
  });

  it('keeps checking with the same key when the answer is lost, and by refund ID once it is pending', () => {
    const checking = run([{ type: 'submit', idempotencyKey: key }, { type: 'outcomeUnknown' }]);
    expect(checking).toMatchObject({ step: 'checking', attempt: { idempotencyKey: key } });
    expect(refundFlowTransition(checking, { type: 'notSent' })).toBe(checking);
    const pending = refundFlowTransition(checking, { type: 'refundSeen', refund: refund('pending') });
    expect(pending).toMatchObject({ step: 'checking', attempt: { idempotencyKey: key, refundId: 'ref_1' } });
    expect(refundFlowTransition(pending, { type: 'refundSeen', refund: refund('completed', 'ref_other') })).toBe(pending);
    expect(refundFlowTransition(pending, { type: 'refundSeen', refund: refund('failed') })).toMatchObject({ step: 'editing', refusal: { reason: 'failed' } });
    expect(refundFlowTransition(checking, { type: 'refundSeen', refund: refund('completed') })).toMatchObject({ step: 'refunded' });
  });

  it('a refusal goes back to editing with the reason and the amount that was asked', () => {
    const refused = run([{ type: 'submit', idempotencyKey: key }, { type: 'refused', reason: 'exceeds_remaining' }]);
    expect(refused).toMatchObject({ step: 'editing', refusal: { reason: 'exceeds_remaining', amount: money(200) } });
    expect(refundFlowTransition(refused, { type: 'edit', draft: { ...draft, amountText: '3.60' } })).toMatchObject({ refusal: null });
  });

  it('does not send an incomplete draft', () => {
    expect(run([{ type: 'submit', idempotencyKey: key }], startRefund(paid, { ...draft, reason: null }))).toMatchObject({ step: 'editing' });
  });

  it('keeps the newest copy of the payment', () => {
    const newer = { ...paid, refunded: money(300), version: 3 };
    const state = run([{ type: 'paymentSeen', payment: newer }, { type: 'paymentSeen', payment: paid }]);
    expect(state.payment).toBe(newer);
  });
});

const keys = ['k1', 'k2', 'k3'].map(asIdempotencyKey);
const eventArb: fc.Arbitrary<RefundFlowEvent> = fc.oneof(
  fc.constantFrom(...keys).map((idempotencyKey): RefundFlowEvent => ({ type: 'submit', idempotencyKey })),
  fc
    .tuple(fc.constantFrom<Refund['status']>('pending', 'completed', 'failed'), fc.constantFrom('ref_1', 'ref_2', 'ref_3'))
    .map(([status, id]): RefundFlowEvent => ({ type: 'refundSeen', refund: refund(status, id) })),
  fc.constantFrom<RefundFlowEvent>(
    { type: 'refused', reason: 'exceeds_remaining' },
    { type: 'notSent' },
    { type: 'outcomeUnknown' },
    { type: 'edit', draft: { ...draft, amountText: '1' } },
    { type: 'edit', draft: { ...draft, reason: null } },
  ),
);

describe('refund flow: properties', () => {
  it('reaches refunded only through a completed refund for the attempt being sent: once named, only that refund', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 30 }), (events) => {
        let state = startRefund(paid, draft);
        for (const event of events) {
          const next = refundFlowTransition(state, event);
          if (next.step === 'refunded' && state.step !== 'refunded') {
            expect(state.step === 'submitting' || state.step === 'checking').toBe(true);
            if (state.step === 'submitting' || state.step === 'checking') {
              expect(event).toMatchObject({ type: 'refundSeen', refund: { status: 'completed' } });
              if (state.attempt.refundId && event.type === 'refundSeen') expect(event.refund.id).toBe(state.attempt.refundId);
            }
          }
          state = next;
        }
      }),
    );
  });

  it('never changes the key of an attempt in flight, and never leaves an unknown outcome for editing', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 30 }), (events) => {
        let state = startRefund(paid, draft);
        for (const event of events) {
          const next = refundFlowTransition(state, event);
          if (state.step === 'checking' && next.step === 'checking') expect(next.attempt.idempotencyKey).toBe(state.attempt.idempotencyKey);
          if (state.step === 'checking' && next.step === 'editing') expect(event.type === 'refused' || event.type === 'refundSeen').toBe(true);
          if (state.step === 'refunded') expect(next).toBe(state);
          state = next;
        }
      }),
    );
  });
});

describe('payment search', () => {
  const p = { ...paid, id: 'pay-7b88' as Payment['id'], createdAt: '2026-10-30T10:36:00.000Z' };
  const time = () => '11:36';
  it.each(['', '4.60', '4,6', '4', '€4.6', '11:3', '7B88'])('finds by "%s"', (query) => expect(matchesPaymentSearch(p, query, time)).toBe(true));
  it.each(['4.7', '5', '12:', 'zz'])('does not match "%s"', (query) => expect(matchesPaymentSearch(p, query, time)).toBe(false));
});
