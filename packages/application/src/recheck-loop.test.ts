import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Timers } from './ports';
import { RecheckLoop, type RecheckStatus } from './recheck-loop';

const timers: Timers = { set: (callback, ms) => setTimeout(callback, ms), clear: (handle) => clearTimeout(handle as never) };
const clock = { now: () => new Date() };

describe('RecheckLoop', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function setup(answers: boolean[]) {
    const statuses: RecheckStatus[] = [];
    const check = vi.fn(async () => answers.shift() ?? false);
    const loop = new RecheckLoop({ timers, clock, check, delaysMs: [5_000, 10_000], onChange: (s) => statuses.push(s) });
    return { loop, check, last: () => statuses.at(-1)! };
  }

  it('backs off between checks and stops once the outcome is known', async () => {
    const { loop, check, last } = setup([true, true, false]);
    loop.schedule();
    expect(last().nextCheckAt).toBe(Date.now() + 5_000);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(check).toHaveBeenCalledTimes(1);
    expect(last().nextCheckAt).toBe(Date.now() + 10_000);
    await vi.advanceTimersByTimeAsync(10_000);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(check).toHaveBeenCalledTimes(3);
    expect(last()).toEqual({ checks: 3, nextCheckAt: null, checking: false });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(check).toHaveBeenCalledTimes(3);
  });

  it('"check now" replaces the scheduled check instead of adding one', async () => {
    const { loop, check } = setup([true, false]);
    loop.schedule();
    await loop.runNow();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(check).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('runs one check at a time', async () => {
    let release: (value: boolean) => void = () => {};
    const check = vi.fn(() => new Promise<boolean>((resolve) => (release = resolve)));
    const loop = new RecheckLoop({ timers, clock, check, onChange: () => {} });
    const first = loop.runNow();
    void loop.runNow();
    release(false);
    await first;
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('keeps checking when a check throws', async () => {
    const check = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(false);
    const loop = new RecheckLoop({ timers, clock, check, delaysMs: [1_000], onChange: () => {} });
    await loop.runNow();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('reset stops the loop and clears the count', async () => {
    const { loop, check, last } = setup([true, true]);
    await loop.runNow();
    loop.reset();
    expect(last()).toEqual({ checks: 0, nextCheckAt: null, checking: false });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(check).toHaveBeenCalledTimes(1);
  });
});
