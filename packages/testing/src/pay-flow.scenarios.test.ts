import { CASHIER_LOGINS, payerLogin, type ZahlnApi } from '@zahln/api-client';
import { PayFlowController, type PayFlowDeps, type Payer } from '@zahln/application';
import { asIdempotencyKey, asUserId, type OrderRef, type PriceGroup } from '@zahln/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeZahlnApi, type Decision, type Fault, type Route } from './fake-api';
import { deviceFor, silentTelemetry, testTimers } from './harness';
import { createMemoryIntentStore } from './memory-adapters';

/**
 * The pay flow end to end: the phone's controller, the real HTTP adapters and
 * a fake of Zahln's server, under the faults its spec describes. Each scenario
 * checks the two rules: never charged twice, never an untrue result.
 */

const VEGGIE = { student: 250, staff: 420, guest: 560 };

interface Setup {
  readonly decide?: (n: number) => Decision;
  readonly payer?: PriceGroup;
  readonly maxAttempts?: number;
  readonly appVersion?: string;
}

async function setup({ decide, payer = 'student', maxAttempts, appVersion }: Setup = {}) {
  const plan: Partial<Record<Route, Fault[]>> = {};
  let decided = 0;
  const fake = new FakeZahlnApi({ faults: (route) => plan[route]?.shift() ?? 'none', decide: decide ? () => decide(++decided) : undefined });
  const till = await deviceFor(fake, CASHIER_LOGINS[0]!);
  const order = await till.orders.create({ lines: [{ itemId: 'item_campus_veggie' as never, quantity: 1 }], idempotencyKey: asIdempotencyKey('order-1') });
  if (!order.ok) throw new Error('order failed');
  const phone = await deviceFor(fake, payerLogin(payer), { maxAttempts, appVersion });
  const intents = createMemoryIntentStore();
  let n = 0;
  const deps: PayFlowDeps = {
    quotes: phone.quotes,
    payments: phone.payments,
    intents,
    ids: { uuid: () => `key-${++n}` },
    clock: { now: () => new Date() },
    serverClock: phone.clock,
    timers: testTimers,
    telemetry: silentTelemetry,
    recheckDelaysMs: [5_000],
    signedInAs: () => phone.session.user?.id ?? null,
  };
  const flow = new PayFlowController(deps);
  const orderRef: OrderRef = { orderId: order.value.id };
  const payerOf: Payer = { id: asUserId(`usr_${payer}`), priceGroup: payer };
  /** Faults for the requests from here on. */
  const fail = (faults: Partial<Record<Route, Fault[]>>) => Object.assign(plan, faults);
  const paid = () => fake.paymentsFor(orderRef.orderId).filter((p) => p.status !== 'declined');
  const pay = async (controller = flow) => {
    await controller.scan(orderRef, payerOf);
    controller.confirm();
    await controller.authorized('biometrics');
  };
  return { fake, flow, intents, orderRef, deps, fail, paid, pay, phone: phone as ZahlnApi, payerOf };
}

describe('pay flow scenarios', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('pays once: pending, then the confirmed amount for this payer', async () => {
    const { flow, intents, paid, pay } = await setup({ payer: 'staff' });
    await pay();
    expect(flow.getSnapshot().state).toMatchObject({ step: 'verifying', payment: { status: 'pending' } });
    await vi.advanceTimersByTimeAsync(5_000);
    const { state } = flow.getSnapshot();
    expect(state).toMatchObject({ step: 'confirmed', payment: { amount: { cents: VEGGIE.staff } } });
    expect(paid()).toHaveLength(1);
    expect(intents.size()).toBe(0);
  });

  it('a lost response shows "being checked", never "failed", and the same key finds the one payment', async () => {
    const { flow, fail, intents, paid, pay } = await setup();
    fail({ pay: ['lost', 'unavailable'] });
    await pay();
    expect(flow.getSnapshot().state).toEqual(expect.objectContaining({ step: 'verifying' }));
    expect(paid()).toHaveLength(1); // the server saved it

    // Repeat 1 is refused as busy. That says nothing about the first attempt,
    // so the student is not told "not paid" and the intent is kept.
    await vi.advanceTimersByTimeAsync(5_000);
    expect(intents.size()).toBe(1);
    expect(flow.getSnapshot().state.step).toBe('verifying');
    await vi.advanceTimersByTimeAsync(5_000); // repeat 2: the key returns the payment
    await vi.advanceTimersByTimeAsync(5_000); // read by ID: confirmed
    expect(flow.getSnapshot().state.step).toBe('confirmed');
    expect(paid()).toHaveLength(1);
  });

  it.each(['drop', 'timeout'] as const)('a %s after the server saved the payment never pays twice', async (fault) => {
    const { flow, fail, paid, pay } = await setup();
    fail({ pay: [fault] });
    await pay();
    expect(flow.getSnapshot().state.step).toBe('verifying');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(flow.getSnapshot().state.step).toBe('confirmed');
    expect(paid()).toHaveLength(1);
  });

  it("the client's own retries reuse the key: one payment", async () => {
    const { flow, fail, paid, pay } = await setup({ maxAttempts: 3 });
    fail({ pay: ['timeout', 'drop'] });
    await pay();
    expect(flow.getSnapshot().state).toMatchObject({ step: 'verifying', payment: { status: 'pending' } });
    expect(paid()).toHaveLength(1);
  });

  it('"check now" settles at once and cancels the scheduled check', async () => {
    const { flow, fail, pay } = await setup();
    fail({ pay: ['lost'] });
    await pay();
    flow.checkNow();
    await vi.advanceTimersByTimeAsync(0);
    flow.checkNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(flow.getSnapshot().state.step).toBe('confirmed');
    expect(flow.getSnapshot().recheck.nextCheckAt).toBeNull();
  });

  it('after a restart, scanning the same order shows the payment in doubt, not a new price', async () => {
    const { flow, deps, fail, paid, pay } = await setup();
    fail({ pay: ['lost', 'network'] });
    await pay();
    const again = new PayFlowController(deps); // the app restarted: same saved intents
    await pay(again);
    expect(again.getSnapshot().state.step).toBe('verifying');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(again.getSnapshot().state.step).toBe('confirmed');
    expect(paid()).toHaveLength(1);
    flow.dispose();
  });

  it('after switching to another test user, a payment in doubt is never sent under their login', async () => {
    const { flow, fail, paid, pay, phone } = await setup();
    fail({ pay: ['lost'] });
    await pay();
    await phone.session.signIn(payerLogin('staff'));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(flow.getSnapshot().state.step).toBe('verifying');
    expect(paid()).toHaveLength(1);
    await phone.session.signIn(payerLogin('student'));
    flow.checkNow();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(flow.getSnapshot().state.step).toBe('confirmed');
    expect(paid()).toHaveLength(1);
  });

  it('cannot be reset while money may be moving', async () => {
    const { flow, fail, pay } = await setup();
    fail({ pay: ['lost'] });
    await pay();
    flow.reset();
    expect(flow.getSnapshot().state.step).toBe('verifying');
  });

  it('a stale read never takes the result back', async () => {
    const { flow, fail, pay } = await setup({ decide: () => 'pending' });
    await pay();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(flow.getSnapshot().state).toMatchObject({ step: 'verifying', payment: { version: 1 } });
    fail({ getPayment: ['stale'] });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(flow.getSnapshot().state).toMatchObject({ step: 'verifying', payment: { version: 1 } });
  });

  it('503 before processing means "not paid", and the intent is forgotten', async () => {
    const { flow, fail, intents, paid, pay } = await setup();
    fail({ pay: ['unavailable'] });
    await pay();
    expect(flow.getSnapshot().state).toEqual({ step: 'notPaid', reason: 'server_busy' });
    expect(intents.size()).toBe(0);
    expect(paid()).toHaveLength(0);
  });

  it('an ended session is renewed without the student noticing, and the payment goes through once', async () => {
    const { flow, fail, paid, pay } = await setup();
    fail({ pay: ['session_expired'] });
    await pay();
    expect(flow.getSnapshot().state).toMatchObject({ step: 'verifying', payment: { status: 'pending' } });
    expect(paid()).toHaveLength(1);
  });

  it('a session that cannot be renewed means "not paid", and the order can be paid after signing in again', async () => {
    const { flow, fail, paid, pay } = await setup();
    fail({ pay: ['session_expired'], login: ['unavailable'] });
    await pay();
    expect(flow.getSnapshot().state).toEqual({ step: 'notPaid', reason: 'session_expired' });
    expect(paid()).toHaveLength(0);
    await pay();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(flow.getSnapshot().state.step).toBe('confirmed');
  });

  it('a declined payment frees the order, and a new decision can pay it', async () => {
    const { flow, fake, orderRef, pay } = await setup({ decide: (n) => (n === 1 ? 'declined' : 'confirmed') });
    await pay();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(flow.getSnapshot().state.step).toBe('declined');
    await pay();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(flow.getSnapshot().state.step).toBe('confirmed');
    expect(fake.paymentsFor(orderRef.orderId).map((p) => p.status)).toEqual(['declined', 'confirmed']);
  });

  it('payments switched off: nothing is charged and the student is told why', async () => {
    const { flow, fake, paid, pay } = await setup();
    fake.paymentsEnabled = false;
    await pay();
    expect(flow.getSnapshot().state).toEqual({ step: 'notPaid', reason: 'payments_disabled' });
    expect(paid()).toHaveLength(0);
  });

  it('an app below the minimum version is refused and told to update', async () => {
    const { flow, fake, pay } = await setup({ appVersion: '0.9.0' });
    fake.minAppVersion = '1.0.0';
    await pay();
    expect(flow.getSnapshot().state).toEqual({ step: 'notPaid', reason: 'update_required' });
  });

  it('an order someone else is paying is not offered to pay', async () => {
    const other = await setup({ decide: () => 'pending' });
    const staff = await deviceFor(other.fake, payerLogin('staff'));
    const quote = await staff.quotes.getQuote(other.orderRef);
    if (!quote.ok) throw new Error('no quote');
    await staff.payments.submit({ idempotencyKey: asIdempotencyKey('staff-1'), userId: asUserId('usr_staff'), quote: quote.value, createdAt: new Date().toISOString() });
    await other.flow.scan(other.orderRef, other.payerOf);
    expect(other.flow.getSnapshot().state).toEqual({ step: 'notPaid', reason: 'payment_in_progress' });
  });

  it('an order past its five minutes shows as expired, and nothing is sent', async () => {
    const { flow, orderRef, payerOf, paid } = await setup();
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await flow.scan(orderRef, payerOf);
    expect(flow.getSnapshot().state).toEqual({ step: 'notPaid', reason: 'quote_expired' });
    expect(paid()).toHaveLength(0);
  });

  it('the code timer running out on review sends nothing', async () => {
    const { flow, orderRef, payerOf, paid } = await setup();
    await flow.scan(orderRef, payerOf);
    flow.quoteExpired();
    expect(flow.getSnapshot().state).toEqual({ step: 'notPaid', reason: 'quote_expired' });
    await flow.authorized('pin');
    expect(paid()).toHaveLength(0);
  });

  it('cancelled biometrics sends nothing and returns to review', async () => {
    const { flow, orderRef, payerOf, intents } = await setup();
    await flow.scan(orderRef, payerOf);
    flow.confirm();
    flow.cancelAuthorization();
    expect(flow.getSnapshot().state.step).toBe('reviewing');
    expect(intents.size()).toBe(0);
  });

  it('a price that arrives after the student left is ignored', async () => {
    const { flow, orderRef, payerOf } = await setup();
    const scanning = flow.scan(orderRef, payerOf);
    flow.reset();
    await scanning;
    expect(flow.getSnapshot().state.step).toBe('idle');
  });

  it('no connection while loading the price: nothing was charged', async () => {
    const { flow, fail, orderRef, payerOf } = await setup();
    fail({ getOrder: ['network'] });
    await flow.scan(orderRef, payerOf);
    expect(flow.getSnapshot().state).toEqual({ step: 'notPaid', reason: 'server_busy' });
  });
});
