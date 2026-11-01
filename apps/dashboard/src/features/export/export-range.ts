import { addDays } from '@zahln/domain';

export type Period = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'custom';
export const PERIODS: readonly Period[] = ['today', 'yesterday', 'last7', 'thisMonth', 'custom'];

export interface DayRange {
  readonly first: string;
  readonly last: string;
}

/**
 * The longest custom range, as long as the longest preset ("This month"). An
 * export reads the whole range as one paged list, so the number of requests
 * grows with the payments in it: this keeps a custom export no costlier than
 * a month-end one, and inside the server's rate limits.
 */
export const MAX_EXPORT_DAYS = 31;

export function presetRange(period: Exclude<Period, 'custom'>, current: string): DayRange {
  switch (period) {
    case 'today':
      return { first: current, last: current };
    case 'yesterday':
      return { first: addDays(current, -1), last: addDays(current, -1) };
    case 'last7':
      return { first: addDays(current, -6), last: current };
    case 'thisMonth':
      return { first: `${current.slice(0, 8)}01`, last: current };
  }
}

export type RangeProblem = 'missing' | 'order' | 'future' | 'tooLong';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** What's wrong with a custom range, or null if it can be loaded. Days are YYYY-MM-DD, so they compare as text. */
export function rangeProblem(range: DayRange, current: string): RangeProblem | null {
  if (!DAY.test(range.first) || !DAY.test(range.last)) return 'missing';
  if (range.first > range.last) return 'order';
  if (range.last > current) return 'future';
  if (addDays(range.first, MAX_EXPORT_DAYS - 1) < range.last) return 'tooLong';
  return null;
}
