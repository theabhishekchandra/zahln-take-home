import { addDays, businessDay, businessDaysRange, type DailyTotals, type MensaId, type Payment, type PaymentStatus } from '@zahln/domain';

import type { Outcome } from '../gateway-error';
import type { Clock, Page, PaymentsPort, ReportsPort } from '../ports';
import { ok } from '../result';

import { listAllPayments } from './list-all';

export interface FinanceDeps {
  readonly reports: ReportsPort;
  readonly payments: PaymentsPort;
  /** The server's clock: "today" is Zahln's day in Berlin, not the browser's. */
  readonly clock: Clock;
}

export interface Overview {
  readonly totals: DailyTotals;
  /** The same weekday a week earlier, for the KPI deltas; null if it couldn't be loaded. */
  readonly weekBefore: DailyTotals | null;
  /** The first few payments that need a look. */
  readonly attention: readonly Payment[];
  /** Whether more need a look than are listed. */
  readonly moreAttention: boolean;
}

export const today = (deps: Pick<FinanceDeps, 'clock'>): string => businessDay(deps.clock.now());

/** W2: one day's totals, the week-before comparison and the top of the attention list. */
export async function loadOverview(deps: FinanceDeps, day: string, attentionCount = 3): Promise<Outcome<Overview>> {
  const [totals, weekBefore, attention] = await Promise.all([
    deps.reports.dailyTotals(day),
    deps.reports.dailyTotals(addDays(day, -7)),
    deps.payments.list({ needsAttention: true, limit: attentionCount }),
  ]);
  if (!totals.ok) return totals;
  if (!attention.ok) return attention;
  return ok({
    totals: totals.value,
    weekBefore: weekBefore.ok ? weekBefore.value : null,
    attention: attention.value.items,
    moreAttention: attention.value.nextCursor !== null,
  });
}

/** Keeps days that are over, so the trend isn't fetched again on every visit. */
export interface TotalsCache {
  get(day: string): DailyTotals | null;
  set(day: string, totals: DailyTotals): void;
}

/**
 * W2's bars: the `days` days up to `lastDay`, oldest first. Zahln reports one
 * day per request, so days already over come from `cache`, and at most two
 * requests run at once, to stay well inside the server's rate limits.
 */
export async function loadTrend(
  deps: Pick<FinanceDeps, 'reports' | 'clock'>,
  lastDay: string,
  days: number,
  cache: TotalsCache,
): Promise<Outcome<readonly DailyTotals[]>> {
  const current = today(deps);
  const wanted = Array.from({ length: days }, (_, i) => addDays(lastDay, i - days + 1));
  const result = new Map<string, DailyTotals>();
  const missing = wanted.filter((day) => {
    const cached = day < current ? cache.get(day) : null;
    if (cached) result.set(day, cached);
    return !cached;
  });
  let failure: Outcome<never> | null = null;
  const worker = async () => {
    for (let day = missing.shift(); day !== undefined && !failure; day = missing.shift()) {
      const totals = await deps.reports.dailyTotals(day);
      if (!totals.ok) {
        failure = totals;
        return;
      }
      result.set(day, totals.value);
      // Pending payments can still settle; only a closed day with none open is final.
      if (day < current && totals.value.pendingCount === 0) cache.set(day, totals.value);
    }
  };
  await Promise.all([worker(), worker()]);
  if (failure) return failure;
  return ok(wanted.map((day) => result.get(day)!));
}

export interface TransactionFilter {
  /** Berlin day. */
  readonly day: string;
  readonly status?: PaymentStatus;
  readonly mensaId?: MensaId;
  /** Payment, order or payer ID, or the start of one. */
  readonly search?: string;
}

/** W4: one page of a day's payments, newest first. */
export function loadTransactions(deps: Pick<FinanceDeps, 'payments'>, filter: TransactionFilter, cursor?: string, limit = 50): Promise<Outcome<Page<Payment>>> {
  const search = filter.search?.trim();
  return deps.payments.list({
    ...businessDaysRange(filter.day, filter.day),
    status: filter.status,
    mensaId: filter.mensaId,
    search: search ? search : undefined,
    cursor,
    limit,
  });
}

/** W3: payments Zahln flags for a look, newest first. */
export function loadAttention(deps: Pick<FinanceDeps, 'payments'>, cursor?: string, limit = 50): Promise<Outcome<Page<Payment>>> {
  return deps.payments.list({ needsAttention: true, cursor, limit });
}

export interface ExportRange {
  readonly first: string;
  readonly last: string;
  readonly mensaId?: MensaId;
}

/** W6: every payment in the range, oldest first, as the books read. */
export async function loadExport(deps: Pick<FinanceDeps, 'payments'>, range: ExportRange): Promise<Outcome<readonly Payment[]>> {
  const all = await listAllPayments(deps.payments, { ...businessDaysRange(range.first, range.last), mensaId: range.mensaId });
  return all.ok ? ok([...all.value].reverse()) : all;
}
