import { netPaid, sumMoney, type Money, type Payment } from '@zahln/domain';

import type { Outcome } from '../gateway-error';
import type { Clock, PaymentsPort } from '../ports';
import { ok } from '../result';

import { listAllPayments } from './list-all';

export interface ActivityDeps {
  readonly payments: PaymentsPort;
  readonly clock: Clock;
}

export interface MonthSummary {
  /** First day of the month, local time. */
  readonly month: Date;
  /** Confirmed payments less refunds. */
  readonly spent: Money;
  readonly confirmedCount: number;
  /** Payments whose outcome the server has not decided yet. Never counted as spent. */
  readonly checking: readonly Payment[];
  readonly recent: readonly Payment[];
  /** Every payment this month, newest first: for the statement. */
  readonly payments: readonly Payment[];
  /** Spent per week of the month (days 1–7, 8–14, …) up to this week; the last is this week. */
  readonly weekly: readonly Money[];
  readonly loadedAt: Date;
}

/** The home screen: the signed-in payer's spending this month, anything being checked, and the latest payments. */
export async function loadMonthSummary(deps: ActivityDeps, recentCount = 3): Promise<Outcome<MonthSummary>> {
  const now = deps.clock.now();
  const month = new Date(now.getFullYear(), now.getMonth(), 1);

  const recent = await deps.payments.list({ limit: recentCount });
  if (!recent.ok) return recent;
  const thisMonth = await listAllPayments(deps.payments, { from: month.toISOString() });
  if (!thisMonth.ok) return thisMonth;

  const confirmed = thisMonth.value.filter((p) => p.status === 'confirmed');
  return ok({
    month,
    spent: sumMoney(confirmed.map(netPaid)),
    confirmedCount: confirmed.length,
    checking: thisMonth.value.filter((p) => p.status === 'pending'),
    recent: recent.value.items,
    payments: thisMonth.value,
    weekly: spentByWeek(confirmed, now),
    loadedAt: now,
  });
}

/** Confirmed spending (less refunds) in 7-day blocks of `now`'s month, from the first block to the one `now` is in. */
export function spentByWeek(confirmed: readonly Payment[], now: Date): readonly Money[] {
  const week = (date: Date) => Math.floor((date.getDate() - 1) / 7);
  const weeks: Payment[][] = Array.from({ length: week(now) + 1 }, () => []);
  for (const payment of confirmed) {
    const created = new Date(payment.createdAt);
    if (created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()) weeks[week(created)]?.push(payment);
  }
  return weeks.map((payments) => sumMoney(payments.map(netPaid)));
}
