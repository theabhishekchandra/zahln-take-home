import {
  initialPayFlowState,
  isPaymentInFlight,
  quoteProblem,
  transition,
  type OrderRef,
  type PayFlowEvent,
  type PayFlowState,
  type PaymentIntent,
  type PriceGroup,
  type UserId,
} from '@zahln/domain';

import type { Clock, QuotesPort, Timers } from './ports';
import { idleRecheck, RecheckLoop, type RecheckStatus } from './recheck-loop';
import { Store } from './store';
import { createPaymentIntent, notPaidReason, reconcilePayment, submitPayment, unsettledFor, type PayDeps } from './use-cases/pay';

export interface PayFlowDeps extends PayDeps {
  readonly quotes: QuotesPort;
  /** The server's time: an order's expiry is decided by it. `clock` (the device's) schedules checks. */
  readonly serverClock: Clock;
  readonly timers: Timers;
  /** Backoff for re-checking an unknown outcome; defaults to `DEFAULT_RECHECK_DELAYS_MS`. */
  readonly recheckDelaysMs?: readonly number[];
}

export interface Payer {
  readonly id: UserId;
  readonly priceGroup: PriceGroup;
}

export type AuthMethod = 'biometrics' | 'pin';

export interface PayFlowSnapshot {
  readonly state: PayFlowState;
  /** The order last scanned, kept so a session can be renewed without scanning again. */
  readonly orderRef: OrderRef | null;
  readonly authMethod: AuthMethod | null;
  readonly recheck: RecheckStatus;
}

const initialSnapshot: PayFlowSnapshot = { state: initialPayFlowState, orderRef: null, authMethod: null, recheck: idleRecheck };

/**
 * Runs one pay flow: the pure state machine (`@zahln/domain`) plus its side
 * effects through the pay use cases. Screens render the snapshot and call the
 * methods; they never decide what happened to the money themselves.
 */
export class PayFlowController {
  private readonly store = new Store<PayFlowSnapshot>(initialSnapshot);
  private readonly recheck: RecheckLoop;
  private readonly deps: PayFlowDeps;
  private payer: Payer | null = null;
  private startedAt: number | null = null;
  /** Bumped on reset, so a quote that arrives after the student left is dropped. */
  private generation = 0;

  readonly subscribe = this.store.subscribe;
  readonly getSnapshot = this.store.get;

  constructor(deps: PayFlowDeps) {
    this.deps = deps;
    this.recheck = new RecheckLoop({
      timers: deps.timers,
      clock: deps.clock,
      delaysMs: deps.recheckDelaysMs,
      check: () => this.reconcile(),
      onChange: (recheck) => this.store.update({ recheck }),
    });
  }

  private get state(): PayFlowState {
    return this.store.get().state;
  }

  /** A QR was scanned or a code typed. Loads the price for this payer. */
  async scan(orderRef: OrderRef, payer: Payer): Promise<void> {
    if (isPaymentInFlight(this.state)) return;
    if (this.state.step !== 'idle') this.reset();
    this.payer = payer;
    this.store.update({ orderRef });
    if (!this.dispatch({ type: 'scanned', orderRef })) return;
    const generation = this.generation;

    // An earlier payment for this order may still be in the air. Paying again is
    // locked until it is settled: show that payment instead of a new price.
    const pending = (await unsettledFor(this.deps)).find((intent) => intent.quote.orderId === orderRef.orderId);
    if (generation !== this.generation) return;
    if (pending) {
      this.dispatch({ type: 'reset' });
      this.resume(pending);
      return;
    }

    const quote = await this.deps.quotes.getQuote(orderRef);
    if (generation !== this.generation) return;
    if (quote.ok) {
      const problem = quoteProblem(quote.value, this.deps.serverClock.now());
      this.dispatch(problem ? { type: 'quoteFailed', reason: problem } : { type: 'quoteLoaded', quote: quote.value });
      return;
    }
    const reason = quote.error.kind === 'not_processed' ? notPaidReason(quote.error) : 'quote_unavailable';
    this.dispatch({ type: 'quoteFailed', reason: reason === 'rejected' ? 'quote_unavailable' : reason });
  }

  /** The code's timer reached 0:00 on the review screen. */
  quoteExpired(): void {
    this.dispatch({ type: 'quoteExpired' });
  }

  /** Pay was tapped. The screen now asks for biometrics or the PIN. */
  confirm(): void {
    this.dispatch({ type: 'confirmRequested' });
  }

  cancelAuthorization(): void {
    this.dispatch({ type: 'authorizationCancelled' });
  }

  /** Biometrics or the PIN succeeded: create the one intent for this decision and send it. */
  async authorized(method: AuthMethod): Promise<void> {
    const { state } = this;
    if (state.step !== 'authorizing' || !this.payer) return;
    const intent = createPaymentIntent(this.deps, this.payer.id, state.quote);
    if (!this.dispatch({ type: 'authorized', intent })) return;
    this.store.update({ authMethod: method });
    this.startedAt = this.deps.clock.now().getTime();
    this.deps.telemetry.event('payment.started', { idempotencyKey: intent.idempotencyKey, method });
    this.apply(await submitPayment(this.deps, intent));
  }

  /** Continue a saved intent whose outcome is unknown, e.g. after the app restarted. */
  resume(intent: PaymentIntent): void {
    if (!this.dispatch({ type: 'resumed', intent })) return;
    this.store.update({ orderRef: { orderId: intent.quote.orderId } });
    this.startedAt = Date.parse(intent.createdAt);
    void this.recheck.runNow();
  }

  /**
   * Settles what is still open. Runs on app start, on return to the foreground
   * and when the connection comes back: a payment being checked is checked now,
   * and a payment saved before the app was closed is picked up again.
   */
  async recover(): Promise<void> {
    if (this.state.step === 'verifying') return this.recheck.runNow();
    if (this.state.step !== 'idle') return;
    const unsettled = await unsettledFor(this.deps);
    const latest = [...unsettled].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (latest && this.state.step === 'idle') this.resume(latest);
  }

  /** "Check now" on a payment that is being checked. Same payment, same key. */
  checkNow(): void {
    if (this.state.step === 'verifying') void this.recheck.runNow();
  }

  /** Back to idle. Ignored while money may be moving. */
  reset(): void {
    if (isPaymentInFlight(this.state)) return;
    this.generation++;
    this.recheck.reset();
    this.payer = null;
    this.startedAt = null;
    this.dispatch({ type: 'reset' });
    this.store.update({ orderRef: null, authMethod: null });
  }

  dispose(): void {
    this.recheck.reset();
    this.store.clearListeners();
  }

  /** One status check for the loop. True while the outcome is still unknown. */
  private async reconcile(): Promise<boolean> {
    const { state } = this;
    if (state.step !== 'verifying') return false;
    this.deps.telemetry.event('payment.check', { idempotencyKey: state.intent.idempotencyKey, check: this.store.get().recheck.checks });
    this.apply(await reconcilePayment(this.deps, state.intent, state.payment), { fromLoop: true });
    return this.state.step === 'verifying';
  }

  private apply(event: PayFlowEvent, { fromLoop = false } = {}): void {
    const before = this.state;
    this.dispatch(event);
    if (this.state.step === 'verifying') {
      // The loop schedules its own next check after a check it ran.
      if (!fromLoop) this.recheck.schedule();
    } else if (isPaymentInFlight(before)) {
      const { checks } = this.store.get().recheck;
      this.recheck.reset();
      this.reportSettled(checks);
    }
  }

  private reportSettled(checks: number): void {
    const { state } = this;
    this.deps.telemetry.event('payment.settled', {
      outcome: state.step,
      reason: state.step === 'notPaid' ? state.reason : undefined,
      checks,
      durationMs: this.startedAt === null ? undefined : this.deps.clock.now().getTime() - this.startedAt,
    });
  }

  private dispatch(event: PayFlowEvent): boolean {
    const next = transition(this.state, event);
    if (next === this.state) return false;
    this.store.update({ state: next });
    return true;
  }
}
