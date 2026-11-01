import {
  asIdempotencyKey,
  emptyRefundDraft,
  refundFlowTransition,
  refundRefusalFor,
  startRefund,
  type Payment,
  type RefundAttempt,
  type RefundDraft,
  type RefundFlowEvent,
  type RefundFlowState,
  type RefundId,
} from '@zahln/domain';

import type { GatewayError } from './gateway-error';
import type { Clock, IdGenerator, PaymentsPort, RefundsPort, Telemetry, Timers } from './ports';
import { idleRecheck, RecheckLoop, type RecheckStatus } from './recheck-loop';
import { Store } from './store';

export interface RefundDeps {
  readonly refunds: RefundsPort;
  readonly payments: PaymentsPort;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly timers: Timers;
  readonly telemetry: Telemetry;
}

export interface RefundSnapshot {
  readonly flow: RefundFlowState;
  /** Why the last send didn't reach Zahln. Nothing was refunded. */
  readonly problem: 'offline' | 'busy' | null;
  readonly recheck: RecheckStatus;
  /** The session could not be renewed; calls are refused until the cashier signs in again. */
  readonly sessionExpired: boolean;
}

/**
 * Refunding one payment from the till. Each attempt has its own idempotency
 * key, and an attempt whose answer was lost is sent again with that same key
 * until the server answers, so a refund is never made twice. Once the server
 * has named the refund, its status is read from the payment until it settles.
 */
export class RefundController {
  private readonly store: Store<RefundSnapshot>;
  private readonly poller: RecheckLoop;
  private readonly deps: RefundDeps;

  readonly subscribe: Store<RefundSnapshot>['subscribe'];
  readonly getSnapshot: Store<RefundSnapshot>['get'];

  constructor(deps: RefundDeps, payment: Payment, draft: RefundDraft = emptyRefundDraft) {
    this.deps = deps;
    this.store = new Store<RefundSnapshot>({ flow: startRefund(payment, draft), problem: null, recheck: idleRecheck, sessionExpired: false });
    this.subscribe = this.store.subscribe;
    this.getSnapshot = this.store.get;
    this.poller = new RecheckLoop({
      timers: deps.timers,
      clock: deps.clock,
      check: () => this.recheck(),
      onChange: (recheck) => this.store.update({ recheck }),
    });
  }

  private get flow(): RefundFlowState {
    return this.store.get().flow;
  }

  edit(draft: RefundDraft): void {
    this.store.update({ problem: null });
    this.dispatch({ type: 'edit', draft });
  }

  /** "Refund €x". Ignored unless the draft is complete and nothing is in flight. */
  async submit(): Promise<void> {
    if (this.store.get().sessionExpired || !this.dispatch({ type: 'submit', idempotencyKey: asIdempotencyKey(this.deps.ids.uuid()) })) return;
    this.store.update({ problem: null });
    const flow = this.flow;
    if (flow.step !== 'submitting') return;
    this.deps.telemetry.event('refund.submitted', { paymentId: flow.payment.id, amountCents: flow.attempt.amount.cents, reason: flow.attempt.reason });
    await this.send(flow.attempt);
  }

  /** "Check now" while a refund's outcome is unknown. */
  checkNow(): void {
    if (this.flow.step === 'checking') void this.poller.runNow();
  }

  /** The cashier signed in again. */
  sessionRenewed(): void {
    this.store.update({ sessionExpired: false });
    this.checkNow();
  }

  dispose(): void {
    this.poller.reset();
    this.store.clearListeners();
  }

  /** Sends the attempt; true while its outcome is still open. */
  private async send(attempt: RefundAttempt): Promise<boolean> {
    const paymentId = this.flow.payment.id;
    const result = await this.deps.refunds.refund({ paymentId, amount: attempt.amount, reason: attempt.reason, idempotencyKey: attempt.idempotencyKey });
    if (result.ok) {
      this.dispatch({ type: 'refundSeen', refund: result.value });
      await this.afterRefundSeen();
    } else {
      await this.failed(result.error);
    }
    return this.stillOpen();
  }

  /** Reads a named refund's status from its payment. True while it is still open. */
  private async readStatus(refundId: RefundId): Promise<boolean> {
    const result = await this.deps.payments.get(this.flow.payment.id);
    if (result.ok) {
      this.dispatch({ type: 'paymentSeen', payment: result.value });
      const refund = result.value.refunds.find((r) => r.id === refundId);
      if (refund) this.dispatch({ type: 'refundSeen', refund });
      await this.afterRefundSeen({ fresh: true });
    } else if (result.error.kind === 'not_processed' && result.error.cause === 'unauthorized') {
      this.store.update({ sessionExpired: true });
    }
    return this.stillOpen();
  }

  private async afterRefundSeen({ fresh = false } = {}): Promise<void> {
    const { flow } = this;
    if (flow.step === 'refunded') {
      this.deps.telemetry.event('refund.completed', { paymentId: flow.payment.id, amountCents: flow.refund.amount.cents });
      if (!fresh) await this.refreshPayment();
    } else if (flow.step === 'editing' && flow.refusal?.reason === 'failed') {
      this.deps.telemetry.event('refund.failed', { paymentId: flow.payment.id });
      if (!fresh) await this.refreshPayment();
    }
  }

  private stillOpen(): boolean {
    const open = this.flow.step === 'checking';
    if (open) this.poller.schedule();
    return open;
  }

  private async failed(error: GatewayError): Promise<void> {
    if (error.kind === 'outcome_unknown') {
      this.deps.telemetry.event('refund.outcome_unknown', { paymentId: this.flow.payment.id, cause: error.cause });
      this.dispatch({ type: 'outcomeUnknown' });
      return;
    }
    if (error.cause === 'rejected') {
      const reason = refundRefusalFor(error.code);
      this.deps.telemetry.event('refund.refused', { paymentId: this.flow.payment.id, reason });
      this.dispatch({ type: 'refused', reason });
      // "Use €x instead" needs what is left now, from the server.
      await this.refreshPayment();
      return;
    }
    if (error.cause === 'unauthorized') this.store.update({ sessionExpired: true });
    else this.store.update({ problem: error.cause === 'offline' ? 'offline' : 'busy' });
    this.dispatch({ type: 'notSent' });
  }

  private async recheck(): Promise<boolean> {
    const flow = this.flow;
    if (flow.step !== 'checking' || this.store.get().sessionExpired) return false;
    return flow.attempt.refundId ? this.readStatus(flow.attempt.refundId) : this.send(flow.attempt);
  }

  private async refreshPayment(): Promise<void> {
    const result = await this.deps.payments.get(this.flow.payment.id);
    if (result.ok) this.dispatch({ type: 'paymentSeen', payment: result.value });
  }

  private dispatch(event: RefundFlowEvent): boolean {
    const next = refundFlowTransition(this.flow, event);
    if (next === this.flow) return false;
    this.store.update({ flow: next });
    if (next.step !== 'checking') this.poller.reset();
    return true;
  }
}
