import { CASHIER_LOGINS, payerLogin } from '@zahln/api-client';
import { SetAsideOrders, TillSaleController } from '@zahln/application';
import { asIdempotencyKey, asMenuItemId, asUserId, type OrderRef } from '@zahln/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeZahlnApi, type Decision, type Fault, type Route } from './fake-api';
import { deviceFor, silentTelemetry, testTimers } from './harness';

/**
 * The till and a student's phone against one fake Zahln server, through the
 * real HTTP adapters. Each scenario checks that the till shows "paid" only
 * when the server confirmed a payment, that an order is never rung up twice,
 * and that an order the till leaves is never paid unnoticed.
 */

const TILL = CASHIER_LOGINS[0]!;
const VEGGIE = asMenuItemId('item_campus_veggie');
const COFFEE = asMenuItemId('item_campus_coffee');

async function setup({ decide }: { readonly decide?: (n: number) => Decision } = {}) {
  const plan: Partial<Record<Route, Fault[]>> = {};
  let decided = 0;
  const fake = new FakeZahlnApi({ faults: (route) => plan[route]?.shift() ?? 'none', decide: decide ? () => decide(++decided) : undefined });
  const till = await deviceFor(fake, TILL);
  const phone = await deviceFor(fake, payerLogin('student'));
  let n = 0;
  const ids = { uuid: () => `id-${++n}` };
  const setAside = new SetAsideOrders({ orders: till.orders, payments: till.payments, timers: testTimers, telemetry: silentTelemetry });
  const sale = new TillSaleController({
    orders: till.orders,
    payments: till.payments,
    setAside,
    ids,
    clock: { now: () => new Date() },
    serverClock: till.clock,
    timers: testTimers,
    telemetry: silentTelemetry,
  });
  const fail = (faults: Partial<Record<Route, Fault[]>>) => Object.assign(plan, faults);

  const ringUp = async (): Promise<OrderRef> => {
    sale.add(VEGGIE);
    sale.add(COFFEE);
    await sale.ringUp();
    const state = sale.getSnapshot().sale;
    if (!state) throw new Error('not rung up');
    return { orderId: state.order.id };
  };
  /** What the student's phone sends: the price it was shown, under a new key. */
  const studentPays = async (orderRef: OrderRef) => {
    const quote = await phone.quotes.getQuote(orderRef);
    if (!quote.ok) return quote;
    return phone.payments.submit({ idempotencyKey: asIdempotencyKey(`pay-${++n}`), userId: asUserId('usr_student'), quote: quote.value, createdAt: new Date().toISOString() });
  };
  return { fake, sale, setAside, ringUp, studentPays, fail };
}

describe('till sale scenarios', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows paid with the amount the server charged the student', async () => {
    const { sale, ringUp, studentPays } = await setup();
    const orderRef = await ringUp();
    expect(sale.getSnapshot().sale).toMatchObject({ step: 'awaiting', order: { amounts: { student: { cents: 360 }, guest: { cents: 730 } } } });
    await studentPays(orderRef);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sale.getSnapshot().sale).toMatchObject({ step: 'paid', payment: { amount: { cents: 360 }, priceGroup: 'student' } });
  });

  it('a lost response on ring-up creates the order once when tapped again', async () => {
    const { fake, sale, fail } = await setup();
    fail({ createOrder: ['lost'] });
    sale.add(VEGGIE);
    await sale.ringUp();
    expect(sale.getSnapshot()).toMatchObject({ sale: null, problem: { action: 'ringUp', reason: 'unknown' } });
    expect(fake.orderCount(TILL.tillId)).toBe(1);
    await sale.ringUp();
    expect(sale.getSnapshot().sale?.step).toBe('awaiting');
    expect(fake.orderCount(TILL.tillId)).toBe(1);
  });

  it('a decline keeps the order open: the same code can be shown again and paid', async () => {
    const { sale, ringUp, studentPays } = await setup({ decide: (n) => (n === 1 ? 'declined' : 'confirmed') });
    const orderRef = await ringUp();
    await studentPays(orderRef);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sale.getSnapshot().sale?.step).toBe('declined');
    sale.showCodeAgain();
    expect(sale.getSnapshot().sale).toMatchObject({ step: 'awaiting', order: { id: orderRef.orderId } });
    await studentPays(orderRef);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sale.getSnapshot().sale?.step).toBe('paid');
  });

  it('a decline seen only through the payment, after the order stopped naming it, still shows', async () => {
    const { fake, sale, ringUp, studentPays } = await setup({ decide: () => 'pending' });
    const orderRef = await ringUp();
    const paid = await studentPays(orderRef);
    if (!paid.ok) throw new Error('not paid');
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sale.getSnapshot().sale).toMatchObject({ step: 'checking', cause: 'review', payment: { status: 'pending' } });
    fake.settlePayment(paid.value.id, 'declined'); // the order is open again and names no payment
    await vi.advanceTimersByTimeAsync(5_000);
    expect(sale.getSnapshot().sale).toMatchObject({ step: 'declined', order: { status: 'open', paymentId: null } });
  });

  it('a lost connection shows checking, then the truth, and the order cannot be set aside meanwhile', async () => {
    const { sale, ringUp, studentPays, fail } = await setup();
    const orderRef = await ringUp();
    fail({ getOrder: ['network'] });
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sale.getSnapshot().sale).toMatchObject({ step: 'checking', cause: 'connection' });
    sale.setAside();
    expect(sale.getSnapshot().sale?.step).toBe('checking');
    await studentPays(orderRef);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(sale.getSnapshot().sale?.step).toBe('paid');
  });

  it('a set-aside order that is paid anyway is raised for a refund', async () => {
    const { sale, setAside, ringUp, studentPays } = await setup();
    const orderRef = await ringUp();
    sale.setAside();
    expect(sale.getSnapshot()).toMatchObject({ sale: null, ticket: [{ itemId: VEGGIE }, { itemId: COFFEE }] });
    expect(setAside.getSnapshot().watching).toBe(1);
    await studentPays(orderRef);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(setAside.getSnapshot()).toMatchObject({ watching: 0, latePayments: [{ order: { id: orderRef.orderId }, payment: { status: 'confirmed', amount: { cents: 360 } } }] });
  });

  it('a set-aside order that nobody pays is watched until the server says it expired', async () => {
    const { sale, setAside, ringUp } = await setup();
    await ringUp();
    sale.setAside();
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 10_000);
    expect(setAside.getSnapshot()).toEqual({ watching: 0, latePayments: [] });
  });

  it('the code expires after five minutes; a new code is a new order, and the old one is watched', async () => {
    const { fake, sale, setAside, ringUp, studentPays } = await setup();
    const old = await ringUp();
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(sale.getSnapshot().sale?.step).toBe('expired');
    await sale.newCode();
    const fresh = sale.getSnapshot().sale;
    expect(fresh).toMatchObject({ step: 'awaiting', order: { status: 'open' } });
    expect(fresh?.order.id).not.toBe(old.orderId);
    expect(fake.orderCount(TILL.tillId)).toBe(2);
    expect(await studentPays(old)).toMatchObject({ ok: false, error: { code: 'order_expired' } });
    expect(setAside.getSnapshot().latePayments).toEqual([]);
  });

  it('an ended session is renewed silently; if renewal fails, the till pauses and keeps the order', async () => {
    const { sale, ringUp, studentPays, fail } = await setup();
    const orderRef = await ringUp();
    fail({ getOrder: ['session_expired'] });
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sale.getSnapshot()).toMatchObject({ sessionExpired: false, sale: { step: 'awaiting' } });

    fail({ getOrder: ['session_expired'], login: ['unavailable'] });
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sale.getSnapshot()).toMatchObject({ sessionExpired: true, sale: { step: 'awaiting', order: { id: orderRef.orderId } } });
    await studentPays(orderRef);
    sale.sessionRenewed();
    await vi.advanceTimersByTimeAsync(0);
    expect(sale.getSnapshot().sale?.step).toBe('paid');
  });

  it('a stale read of the order never takes the till back', async () => {
    const { sale, ringUp, studentPays, fail } = await setup({ decide: () => 'pending' });
    const orderRef = await ringUp();
    await studentPays(orderRef);
    await vi.advanceTimersByTimeAsync(2_000);
    const checking = sale.getSnapshot().sale;
    expect(checking).toMatchObject({ step: 'checking', order: { status: 'paying' } });
    fail({ getOrder: ['stale'] });
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sale.getSnapshot().sale).toMatchObject({ step: 'checking', order: { status: 'paying', version: checking?.order.version } });
  });

  it('only a paid sale can move on to the next order', async () => {
    const { sale, ringUp, studentPays } = await setup();
    const orderRef = await ringUp();
    sale.next();
    expect(sale.getSnapshot().sale?.step).toBe('awaiting');
    await studentPays(orderRef);
    await vi.advanceTimersByTimeAsync(2_000);
    sale.next();
    expect(sale.getSnapshot()).toMatchObject({ sale: null, ticket: [] });
  });
});
