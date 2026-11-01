import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { order, payment } from './__fixtures__';
import { asOrderId, asPaymentId } from './ids';
import type { Order, OrderStatus } from './order';
import type { Payment, PaymentStatus } from './payment';
import { canSetAside, isSaleFinished, startSale, tillSaleTransition, type TillSaleEvent, type TillSaleState } from './till-sale';

const seen = (status: PaymentStatus, version = 1, id = 'pay_1'): TillSaleEvent => ({
  type: 'paymentSeen',
  payment: payment(status, version, { id: asPaymentId(id) }),
});
const orderSeen = (status: OrderStatus, version: number): TillSaleEvent => ({ type: 'orderSeen', order: { ...order, status, version } });
const run = (events: TillSaleEvent[], from: TillSaleState = startSale(order)) => events.reduce(tillSaleTransition, from);

describe('till sale', () => {
  it('shows paid only for a confirmed payment for this order', () => {
    expect(run([seen('confirmed')])).toMatchObject({ step: 'paid' });
    const foreign: Payment = payment('confirmed', 1, { orderId: asOrderId('ord_other') });
    const awaiting = startSale(order);
    expect(tillSaleTransition(awaiting, { type: 'paymentSeen', payment: foreign })).toBe(awaiting);
  });

  it('an order the server calls paid is checked until the confirmed payment is read', () => {
    const checking = run([orderSeen('paid', 3)]);
    expect(checking).toMatchObject({ step: 'checking', cause: 'review' });
    expect(tillSaleTransition(checking, seen('confirmed', 2))).toMatchObject({ step: 'paid' });
  });

  it('keeps the order open after a decline, shows the same code again and accepts a later payment', () => {
    const declined = run([seen('declined')]);
    expect(declined).toMatchObject({ step: 'declined', payment: { status: 'declined' } });
    const again = tillSaleTransition(declined, { type: 'showCodeAgain' });
    expect(again).toEqual({ step: 'awaiting', order });
    expect(tillSaleTransition(again, seen('confirmed', 1, 'pay_2'))).toMatchObject({ step: 'paid' });
  });

  it('an expired code still shows a payment that arrives late, since money moved', () => {
    expect(run([{ type: 'qrExpired' }, orderSeen('paying', 2), seen('confirmed')])).toMatchObject({ step: 'paid' });
  });

  it('a lost connection means checking, ended by any answer from the server', () => {
    const checking = run([{ type: 'statusUnavailable' }]);
    expect(checking).toEqual({ step: 'checking', order, cause: 'connection' });
    expect(canSetAside(checking)).toBe(false);
    expect(tillSaleTransition(checking, { type: 'orderSeen', order })).toEqual({ step: 'awaiting', order });
  });

  it('a pending payment is checked until the server decides, and outlives the order expiring', () => {
    const checking = run([seen('pending', 1)]);
    expect(checking).toMatchObject({ step: 'checking', cause: 'review' });
    expect(tillSaleTransition(checking, seen('pending', 1))).toBe(checking);
    const afterExpiry = tillSaleTransition(checking, orderSeen('expired', 4));
    expect(afterExpiry).toMatchObject({ step: 'checking', payment: { id: 'pay_1' } });
    expect(tillSaleTransition(afterExpiry, seen('confirmed', 2))).toMatchObject({ step: 'paid' });
  });

  it('never goes back to an older read of the order', () => {
    const paying = run([orderSeen('paying', 3)]);
    expect(tillSaleTransition(paying, orderSeen('open', 2))).toBe(paying);
  });

  it('a decline on an order that has expired meanwhile ends in expired', () => {
    const checking = run([seen('pending', 1), orderSeen('expired', 4)]);
    expect(tillSaleTransition(checking, seen('declined', 2))).toMatchObject({ step: 'expired', order: { status: 'expired' } });
  });
});

const orders: Order[] = (['open', 'paying', 'paid', 'expired'] as const).flatMap((status) => [1, 2, 3].map((version) => ({ ...order, status, version })));
const eventArb: fc.Arbitrary<TillSaleEvent> = fc.oneof(
  fc.constantFrom<PaymentStatus>('pending', 'confirmed', 'declined').chain((status) =>
    fc.tuple(fc.integer({ min: 1, max: 4 }), fc.constantFrom('pay_1', 'pay_2')).map(([version, id]) => seen(status, version, id)),
  ),
  fc.constantFrom(...orders).map((o): TillSaleEvent => ({ type: 'orderSeen', order: o })),
  fc.constantFrom<TillSaleEvent>({ type: 'statusUnavailable' }, { type: 'qrExpired' }, { type: 'showCodeAgain' }),
);

describe('till sale: properties', () => {
  it('reaches paid only through a confirmed payment for this order', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 30 }), (events) => {
        let state = startSale(order);
        for (const event of events) {
          const next = tillSaleTransition(state, event);
          if (next.step === 'paid' && state.step !== 'paid') {
            expect(event).toMatchObject({ type: 'paymentSeen', payment: { status: 'confirmed', orderId: order.id } });
          }
          state = next;
        }
      }),
    );
  });

  it('a finished sale never changes again', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 30 }), fc.array(eventArb, { maxLength: 10 }), (before, after) => {
        const state = run(before);
        if (!isSaleFinished(state)) return;
        expect(run(after, state)).toBe(state);
      }),
    );
  });

  it('never shows an older read of the order than one already seen', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 30 }), (events) => {
        let state = startSale(order);
        for (const event of events) {
          const next = tillSaleTransition(state, event);
          expect(next.order.version).toBeGreaterThanOrEqual(state.order.version);
          state = next;
        }
      }),
    );
  });

  it('a payment in doubt can never be set aside', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 30 }), (events) => {
        const state = run(events);
        if (state.step === 'checking') expect(canSetAside(state)).toBe(false);
      }),
    );
  });
});
