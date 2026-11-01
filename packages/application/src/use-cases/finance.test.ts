import { money, type DailyTotals } from '@zahln/domain';
import { describe, expect, it, vi } from 'vitest';

import { err, ok } from '../result';
import type { PaymentsPort, ReportsPort } from '../ports';

import { loadOverview, loadTransactions, loadTrend, type TotalsCache } from './finance';

const totals = (date: string, netCents: number, pendingCount = 0): DailyTotals => ({
  date,
  paymentCount: 1,
  gross: money(netCents),
  refunded: money(0),
  net: money(netCents),
  pendingCount,
  pending: money(0),
  mensas: [],
});

const clock = { now: () => new Date('2026-10-31T10:00:00Z') };

function reports(): ReportsPort & { readonly asked: string[]; inFlight: number; maxInFlight: number } {
  const port = {
    asked: [] as string[],
    inFlight: 0,
    maxInFlight: 0,
    async dailyTotals(date?: string) {
      port.asked.push(date!);
      port.inFlight++;
      port.maxInFlight = Math.max(port.maxInFlight, port.inFlight);
      await Promise.resolve();
      port.inFlight--;
      return ok(totals(date!, 100, date === '2026-10-30' ? 1 : 0));
    },
  };
  return port;
}

function memoryCache(): TotalsCache & { readonly days: Map<string, DailyTotals> } {
  const days = new Map<string, DailyTotals>();
  return { days, get: (day) => days.get(day) ?? null, set: (day, value) => void days.set(day, value) };
}

describe('loadTrend', () => {
  it('asks for each day once, two at a time, and keeps only closed days with nothing pending', async () => {
    const port = reports();
    const cache = memoryCache();
    const first = await loadTrend({ reports: port, clock }, '2026-10-31', 7, cache);
    expect(first.ok && first.value.map((t) => t.date)).toEqual(['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']);
    expect(port.maxInFlight).toBeLessThanOrEqual(2);
    expect([...cache.days.keys()].sort()).toEqual(['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29']);

    port.asked.length = 0;
    await loadTrend({ reports: port, clock }, '2026-10-31', 7, cache);
    expect(port.asked.sort()).toEqual(['2026-10-30', '2026-10-31']);
  });

  it('fails as a whole when a day cannot be loaded', async () => {
    const failing: ReportsPort = { dailyTotals: async () => err({ kind: 'not_processed', cause: 'rate_limited', retryable: true }) };
    expect(await loadTrend({ reports: failing, clock }, '2026-10-31', 3, memoryCache())).toMatchObject({ ok: false, error: { cause: 'rate_limited' } });
  });
});

describe('loadOverview', () => {
  it('compares with the same weekday a week before, and still loads without it', async () => {
    const port: ReportsPort = {
      dailyTotals: async (date) => (date === '2026-10-24' ? err({ kind: 'not_processed', cause: 'unavailable', retryable: true }) : ok(totals(date!, 500))),
    };
    const payments = { list: vi.fn(async () => ok({ items: [], nextCursor: 'more' })) } as unknown as PaymentsPort;
    const overview = await loadOverview({ reports: port, payments, clock }, '2026-10-31');
    expect(overview).toMatchObject({ ok: true, value: { totals: { date: '2026-10-31' }, weekBefore: null, moreAttention: true } });
  });
});

describe('loadTransactions', () => {
  it("asks for the Berlin day's instants and leaves out an empty search", async () => {
    const list = vi.fn(async () => ok({ items: [], nextCursor: null }));
    await loadTransactions({ payments: { list } as unknown as PaymentsPort }, { day: '2026-10-31', search: '  ' });
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ from: '2026-10-30T23:00:00.000Z', to: '2026-10-31T23:00:00.000Z', search: undefined }));
  });
});
