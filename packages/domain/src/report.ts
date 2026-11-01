import type { MensaId, TillId } from './ids';
import type { Money } from './money';
import type { Ref } from './order';

/**
 * One day's money as the server counts it (Europe/Berlin). Confirmed payments
 * count on the day they were made, refunds on the day they completed. Pending
 * payments are counted apart and are never in `gross`.
 */
export interface Totals {
  readonly paymentCount: number;
  readonly gross: Money;
  readonly refunded: Money;
  readonly net: Money;
  readonly pendingCount: number;
  readonly pending: Money;
}

export interface TillTotals extends Totals {
  readonly till: Ref<TillId>;
}

export interface MensaTotals extends Totals {
  readonly mensa: Ref<MensaId>;
  readonly tills: readonly TillTotals[];
}

export interface DailyTotals extends Totals {
  /** YYYY-MM-DD, in Europe/Berlin. */
  readonly date: string;
  readonly mensas: readonly MensaTotals[];
}
