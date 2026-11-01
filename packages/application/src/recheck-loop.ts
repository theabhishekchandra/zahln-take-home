import type { Clock, Timers } from './ports';

/** 5 s, 10 s, 20 s, then every 30 s: quick at first, gentle on a struggling server after. */
export const DEFAULT_RECHECK_DELAYS_MS: readonly number[] = [5_000, 10_000, 20_000, 30_000];

/** What the screen shows: "Next check in 20 s · checked 3 times". */
export interface RecheckStatus {
  readonly checks: number;
  /** Epoch ms of the next automatic check; null while checking or stopped. */
  readonly nextCheckAt: number | null;
  readonly checking: boolean;
}

export const idleRecheck: RecheckStatus = { checks: 0, nextCheckAt: null, checking: false };

export interface RecheckLoopOptions {
  readonly timers: Timers;
  readonly clock: Clock;
  /** One status check. Resolves true while the outcome is still unknown, so the loop continues. */
  readonly check: () => Promise<boolean>;
  readonly onChange: (status: RecheckStatus) => void;
  /** Backoff by check count, or a function for a delay that depends on the caller's state. */
  readonly delaysMs?: readonly number[] | ((checks: number) => number);
}

/**
 * Keeps asking until an unknown outcome becomes known, with backoff, one check
 * at a time. Used wherever the app must not guess: a payment being checked on
 * the phone, a lost connection on the till, a refund in flight.
 */
export class RecheckLoop {
  private status: RecheckStatus = idleRecheck;
  private timer: unknown = null;
  private readonly options: RecheckLoopOptions;

  constructor(options: RecheckLoopOptions) {
    this.options = options;
  }

  /** Schedules the next check, unless one is already scheduled or running. */
  schedule(): void {
    if (this.timer !== null || this.status.checking) return;
    const delay = this.nextDelay();
    this.timer = this.options.timers.set(() => {
      this.timer = null;
      void this.runNow();
    }, delay);
    this.set({ nextCheckAt: this.options.clock.now().getTime() + delay });
  }

  /** Checks immediately ("Check now"). Ignored while a check is running. */
  async runNow(): Promise<void> {
    if (this.status.checking) return;
    this.cancelTimer();
    this.set({ checking: true, nextCheckAt: null, checks: this.status.checks + 1 });
    let unknown: boolean;
    try {
      unknown = await this.options.check();
    } catch {
      // A failed check proves nothing; keep checking.
      unknown = true;
    }
    this.set({ checking: false });
    if (unknown) this.schedule();
  }

  private nextDelay(): number {
    const delays = this.options.delaysMs ?? DEFAULT_RECHECK_DELAYS_MS;
    if (typeof delays === 'function') return delays(this.status.checks);
    return delays[Math.min(this.status.checks, delays.length - 1)] ?? 30_000;
  }

  /** Stops checking and forgets the count. */
  reset(): void {
    this.cancelTimer();
    this.set(idleRecheck);
  }

  private cancelTimer(): void {
    if (this.timer === null) return;
    this.options.timers.clear(this.timer);
    this.timer = null;
    this.set({ nextCheckAt: null });
  }

  private set(patch: Partial<RecheckStatus>): void {
    this.status = { ...this.status, ...patch };
    this.options.onChange(this.status);
  }
}
