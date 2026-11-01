import { CASHIER_LOGINS } from '@zahln/api-client';
import { loadTodayOnTill, RefundController } from '@zahln/application';
import { refundBlockedBy, type Payment, type RefundDraft } from '@zahln/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeZahlnApi, type Fault, type Route } from './fake-api';
import { deviceFor, silentTelemetry, testTimers } from './harness';

/**
 * Refunds at the till against a fake Zahln server, through the real HTTP
 * adapters. Money goes back at most once per attempt, and the till says
 * "refunded" only for a refund the server completed.
 */

const TILL = CASHIER_LOGINS[0]!;
const draft = (amountText: string): RefundDraft => ({ mode: 'partial', amountText, reason: 'wrong_dish' });
const MEAL = [{ itemId: 'item_campus_meat', quantity: 1 }, { itemId: 'item_campus_dessert', quantity: 1 }]; // 4.10 for a student

async function setup({ decideRefund }: { readonly decideRefund?: () => 'completed' | 'failed' | 'pending' } = {}) {
  const plan: Partial<Record<Route, Fault[]>> = {};
  const fake = new FakeZahlnApi({ faults: (route) => plan[route]?.shift() ?? 'none', decideRefund });
  const hour = (h: number) => new Date(new Date().setHours(h, 0, 0, 0));
  const seeded = {
    confirmed: fake.seedPayment({ tillId: TILL.tillId, payer: 'student', status: 'confirmed', createdAt: hour(0), items: MEAL }),
    declined: fake.seedPayment({ tillId: TILL.tillId, payer: 'staff', status: 'declined', createdAt: hour(0) }),
    pending: fake.seedPayment({ tillId: TILL.tillId, payer: 'guest', status: 'pending', createdAt: hour(0) }),
    old: fake.seedPayment({ tillId: TILL.tillId, payer: 'student', status: 'confirmed', createdAt: new Date(Date.now() - 31 * 86_400_000) }),
    otherTill: fake.seedPayment({ tillId: 'till_campus_2', payer: 'student', status: 'confirmed', createdAt: hour(0) }),
  };
  const till = await deviceFor(fake, TILL);
  const read = async (id: string): Promise<Payment> => {
    const result = await till.payments.get(id as Payment['id']);
    if (!result.ok) throw new Error(`no payment ${id}`);
    return result.value;
  };
  let n = 0;
  const refundOf = async (id: string, start = draft('2,00')) =>
    new RefundController(
      { refunds: till.refunds, payments: till.payments, ids: { uuid: () => `refund-key-${++n}` }, clock: till.clock, timers: testTimers, telemetry: silentTelemetry },
      await read(id),
      start,
    );
  const fail = (faults: Partial<Record<Route, Fault[]>>) => Object.assign(plan, faults);
  return { fake, till, seeded, refundOf, read, fail };
}

describe('refund scenarios', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-31T13:00:00') }));
  afterEach(() => vi.useRealTimers());

  it("today's list on a till has its own payments of every kind, and no other till's", async () => {
    const { till, seeded } = await setup();
    const today = await loadTodayOnTill({ payments: till.payments, clock: till.clock });
    expect(today.ok && today.value.map((p) => p.id).sort()).toEqual([seeded.confirmed.id, seeded.declined.id, seeded.pending.id].sort());
  });

  it('a partial refund is pending, then completed, and the payment shows what is left', async () => {
    const { seeded, refundOf } = await setup();
    const refund = await refundOf(seeded.confirmed.id);
    await refund.submit();
    expect(refund.getSnapshot().flow).toMatchObject({ step: 'checking', attempt: { refundId: expect.any(String) } });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(refund.getSnapshot().flow).toMatchObject({ step: 'refunded', refund: { amount: { cents: 200 }, status: 'completed' }, payment: { refunded: { cents: 200 }, refundable: { cents: 210 } } });
  });

  it.each(['lost', 'timeout', 'drop'] as const)('a %s answer is sent again with the same key, and the money goes back once', async (fault) => {
    const { fake, seeded, refundOf, fail } = await setup();
    fail({ refund: [fault] });
    const refund = await refundOf(seeded.confirmed.id);
    await refund.submit();
    expect(refund.getSnapshot().flow).toMatchObject({ step: 'checking' });
    await vi.advanceTimersByTimeAsync(5_000); // sent again: the key returns the refund
    await vi.advanceTimersByTimeAsync(10_000); // its status is read
    expect(refund.getSnapshot().flow.step).toBe('refunded');
    expect(fake.refundsFor(seeded.confirmed.id)).toHaveLength(1);
  });

  it('more than is left is refused with what can still be refunded, and a smaller amount then works', async () => {
    const { seeded, refundOf } = await setup();
    const refund = await refundOf(seeded.confirmed.id, draft('9,00'));
    await refund.submit();
    expect(refund.getSnapshot().flow).toMatchObject({ step: 'editing', refusal: { reason: 'exceeds_remaining' }, payment: { refundable: { cents: 410 } } });
    refund.edit(draft('1'));
    await refund.submit();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(refund.getSnapshot().flow.step).toBe('refunded');
  });

  it('a refund the server fails returns no money, and says so', async () => {
    const { fake, seeded, refundOf } = await setup({ decideRefund: () => 'failed' });
    const refund = await refundOf(seeded.confirmed.id);
    await refund.submit();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(refund.getSnapshot().flow).toMatchObject({ step: 'editing', refusal: { reason: 'failed' }, payment: { refunded: { cents: 0 } } });
    expect(fake.refundsFor(seeded.confirmed.id).map((r) => r.status)).toEqual(['failed']);
  });

  it('a refund still pending counts against what is left', async () => {
    const { seeded, refundOf, read } = await setup({ decideRefund: () => 'pending' });
    const refund = await refundOf(seeded.confirmed.id, { mode: 'full', amountText: '', reason: 'quality' });
    await refund.submit();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(refund.getSnapshot().flow.step).toBe('checking');
    expect(refundBlockedBy(await read(seeded.confirmed.id))).toBe('refund_pending');
  });

  it('declined and pending payments are refused, and the payment says why', async () => {
    const { seeded, refundOf } = await setup();
    for (const [id, why] of [
      [seeded.declined.id, 'declined'],
      [seeded.pending.id, 'being_checked'],
    ] as const) {
      const refund = await refundOf(id);
      expect(refundBlockedBy(refund.getSnapshot().flow.payment)).toBe(why);
    }
  });

  it('a payment older than 30 days can no longer be refunded', async () => {
    const { seeded, refundOf } = await setup();
    const refund = await refundOf(seeded.old.id);
    await refund.submit();
    expect(refund.getSnapshot().flow).toMatchObject({ step: 'editing', refusal: { reason: 'window_closed' } });
  });

  it('503 before anything happened: nothing was refunded, so the cashier can try again', async () => {
    const { fake, seeded, refundOf, fail } = await setup();
    fail({ refund: ['unavailable'] });
    const refund = await refundOf(seeded.confirmed.id);
    await refund.submit();
    expect(refund.getSnapshot()).toMatchObject({ problem: 'busy', flow: { step: 'editing' } });
    expect(fake.refundsFor(seeded.confirmed.id)).toHaveLength(0);
    await refund.submit();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(refund.getSnapshot().flow.step).toBe('refunded');
  });

  it('a session that cannot be renewed pauses the refund; signed in again, it can be sent', async () => {
    const { seeded, refundOf, fail } = await setup();
    fail({ refund: ['session_expired'], login: ['unavailable'] });
    const refund = await refundOf(seeded.confirmed.id);
    await refund.submit();
    expect(refund.getSnapshot()).toMatchObject({ sessionExpired: true, flow: { step: 'editing' } });
    refund.sessionRenewed();
    await refund.submit();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(refund.getSnapshot().flow.step).toBe('refunded');
  });
});
