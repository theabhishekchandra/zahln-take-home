import { asPaymentId, type PaymentDetail } from '@zahln/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { err, ok } from './result';
import type { Outcome } from './gateway-error';
import { PaymentWatcher } from './payment-watcher';
import type { Timers } from './ports';

const timers: Timers = { set: (callback, ms) => setTimeout(callback, ms), clear: (handle) => clearTimeout(handle as never) };
const clock = { now: () => new Date() };
const id = asPaymentId('pay_1');

function detail(patch: Partial<PaymentDetail>): PaymentDetail {
  return {
    id,
    status: 'pending',
    version: 1,
    refundPending: { cents: 0, currency: 'EUR' },
    ...patch,
  } as PaymentDetail;
}

describe('PaymentWatcher', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup(answers: Outcome<PaymentDetail>[]) {
    const get = vi.fn(async () => answers.shift() ?? ok(detail({ status: 'confirmed', version: 9 })));
    const watcher = new PaymentWatcher({ payments: { get }, timers, clock, delaysMs: [5_000] }, id);
    return { watcher, get };
  }

  it('reads again while the payment is being checked and stops once Zahln decides', async () => {
    const { watcher, get } = setup([ok(detail({ version: 1 })), ok(detail({ version: 2 })), ok(detail({ status: 'confirmed', version: 3 }))]);
    watcher.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(watcher.getSnapshot().payment?.status).toBe('pending');
    expect(watcher.getSnapshot().recheck.nextCheckAt).not.toBeNull();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(watcher.getSnapshot().payment?.status).toBe('confirmed');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(get).toHaveBeenCalledTimes(3);
    expect(watcher.getSnapshot().recheck.checks).toBe(2);
  });

  it('never shows an older answer over a newer one', async () => {
    const { watcher } = setup([ok(detail({ status: 'confirmed', version: 5 })), ok(detail({ status: 'pending', version: 4 }))]);
    watcher.start();
    await vi.advanceTimersByTimeAsync(0);
    watcher.checkNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(watcher.getSnapshot().payment).toMatchObject({ status: 'confirmed', version: 5 });
  });

  it('keeps the last good copy when a read fails, and tries again', async () => {
    const { watcher, get } = setup([ok(detail({ version: 1 })), err({ kind: 'not_processed', cause: 'offline', retryable: true })]);
    watcher.start();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(watcher.getSnapshot()).toMatchObject({ failed: true, payment: { version: 1 } });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(get).toHaveBeenCalledTimes(3);
    expect(watcher.getSnapshot()).toMatchObject({ failed: false, payment: { status: 'confirmed' } });
  });

  it('keeps watching while a refund is under way', async () => {
    const { watcher, get } = setup([ok(detail({ status: 'confirmed', refundPending: { cents: 100, currency: 'EUR' } }))]);
    watcher.start();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('drops an answer that arrives after stop', async () => {
    const { watcher } = setup([ok(detail({ version: 1 }))]);
    watcher.start();
    watcher.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(watcher.getSnapshot().payment).toBeNull();
  });
});
