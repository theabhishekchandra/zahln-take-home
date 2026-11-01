import { newerPayment, type PaymentDetail, type PaymentId } from '@zahln/domain';

import type { Clock, PaymentsPort, Timers } from './ports';
import { idleRecheck, RecheckLoop, type RecheckStatus } from './recheck-loop';
import { Store } from './store';

export interface PaymentWatchState {
  readonly payment: PaymentDetail | null;
  /** The last read failed. `payment`, if any, is the last good copy. */
  readonly failed: boolean;
  /** The server refused the read for good, e.g. the payment doesn't exist for this login. */
  readonly gone: boolean;
  readonly recheck: RecheckStatus;
}

export interface PaymentWatcherDeps {
  readonly payments: Pick<PaymentsPort, 'get'>;
  readonly timers: Timers;
  readonly clock: Clock;
  readonly delaysMs?: readonly number[];
}

/** Zahln may still change this payment: it's being checked, or a refund is under way. */
export function isUndecided(payment: PaymentDetail): boolean {
  return payment.status === 'pending' || payment.refundPending.cents > 0;
}

/**
 * Screens 17 and 18: one payment, read again with backoff while Zahln is
 * still deciding it. It only ever reads, so "Check now" can't pay twice. An
 * older answer never replaces a newer one (reads can be out of date).
 */
export class PaymentWatcher {
  private readonly store = new Store<PaymentWatchState>({ payment: null, failed: false, gone: false, recheck: idleRecheck });
  private readonly loop: RecheckLoop;
  /** Grows on every start and stop, so an answer from before is dropped. */
  private generation = 0;

  readonly subscribe = this.store.subscribe;
  readonly getSnapshot = this.store.get;

  private readonly deps: PaymentWatcherDeps;
  private readonly paymentId: PaymentId;

  constructor(deps: PaymentWatcherDeps, paymentId: PaymentId) {
    this.deps = deps;
    this.paymentId = paymentId;
    this.loop = new RecheckLoop({
      timers: deps.timers,
      clock: deps.clock,
      delaysMs: deps.delaysMs,
      check: () => this.read(this.generation),
      onChange: (recheck) => this.store.update({ recheck }),
    });
  }

  /** The first read; the loop takes over only if the answer is undecided or missing. */
  start(): void {
    const generation = ++this.generation;
    void this.read(generation).then((again) => {
      if (again && generation === this.generation) this.loop.schedule();
    });
  }

  /** "Check now": reads at once instead of waiting for the next scheduled check. */
  checkNow(): void {
    void this.loop.runNow();
  }

  stop(): void {
    this.generation++;
    this.loop.reset();
  }

  /** Resolves true while there's reason to read again. */
  private async read(generation: number): Promise<boolean> {
    const result = await this.deps.payments.get(this.paymentId);
    if (generation !== this.generation) return false;
    if (!result.ok) {
      const gone = result.error.kind === 'not_processed' && !result.error.retryable && result.error.cause === 'rejected';
      this.store.update({ failed: true, gone });
      return !gone;
    }
    const payment = newerPayment(this.store.get().payment ?? undefined, result.value);
    this.store.update({ payment, failed: false, gone: false });
    return isUndecided(payment);
  }
}
