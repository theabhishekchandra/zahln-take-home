import {
  addToTicket,
  asIdempotencyKey,
  canSetAside,
  emptyTicket,
  isSaleFinished,
  isSaleSettled,
  isSettled,
  orderLines,
  removeFromTicket,
  startSale,
  tillSaleTransition,
  type IdempotencyKey,
  type MenuItemId,
  type Order,
  type PaymentId,
  type Ticket,
  type TillSaleEvent,
  type TillSaleState,
} from '@zahln/domain';

import type { GatewayError } from './gateway-error';
import type { Clock, IdGenerator, OrdersPort, PaymentsPort, Telemetry, Timers } from './ports';
import { idleRecheck, RecheckLoop, type RecheckStatus } from './recheck-loop';
import type { OrderWatch } from './set-aside-orders';
import { Store } from './store';

export interface TillSaleDeps {
  readonly orders: OrdersPort;
  readonly payments: PaymentsPort;
  /** Takes the orders the till leaves before the server has settled them. */
  readonly setAside: OrderWatch;
  readonly ids: IdGenerator;
  /** The device's time, for scheduling and durations. */
  readonly clock: Clock;
  /** The server's time: orders expire by it. */
  readonly serverClock: Clock;
  readonly timers: Timers;
  readonly telemetry: Telemetry;
  /** How often to ask for the payment while the QR is shown. */
  readonly pollMs?: number;
  /** How often to ask once the connection is in doubt (design T7: every 5 s). */
  readonly recheckMs?: number;
}

export type TillAction = 'ringUp' | 'newCode';

/** Why an action did not go through. The till says so and keeps the ticket or order as it was. */
export interface TillProblem {
  readonly action: TillAction;
  readonly reason: 'offline' | 'busy' | 'refused' | 'unknown';
}

export interface TillSaleSnapshot {
  /** Editable until it is rung up; kept while the sale is open. */
  readonly ticket: Ticket;
  readonly sale: TillSaleState | null;
  readonly pending: TillAction | null;
  readonly problem: TillProblem | null;
  readonly recheck: RecheckStatus;
  /** The session could not be renewed; calls are refused until the cashier signs in again. The sale is kept. */
  readonly sessionExpired: boolean;
}

const initial: TillSaleSnapshot = {
  ticket: emptyTicket,
  sale: null,
  pending: null,
  problem: null,
  recheck: idleRecheck,
  sessionExpired: false,
};

/**
 * One till's checkout: the ticket, the order it becomes, and the wait for the
 * server's word on the payment. The till never infers an outcome; it shows the
 * `TillSaleState` (`@zahln/domain`) and that only moves on what the server says.
 */
export class TillSaleController {
  private readonly store = new Store<TillSaleSnapshot>(initial);
  private readonly poller: RecheckLoop;
  private readonly deps: TillSaleDeps;
  /** Kept across retries of the same ticket, so a lost response never creates a second order. */
  private ringUpKey: IdempotencyKey | null = null;
  /** The same for a new code for an expired order. */
  private newCodeKey: IdempotencyKey | null = null;
  /** Declines already shown for this sale, so an old one is never shown again. */
  private readonly shownDeclines = new Set<PaymentId>();
  private qrTimer: { readonly handle: unknown; readonly expiresAt: string } | null = null;
  private saleStartedAt = 0;

  readonly subscribe = this.store.subscribe;
  readonly getSnapshot = this.store.get;

  constructor(deps: TillSaleDeps) {
    this.deps = deps;
    this.poller = new RecheckLoop({
      timers: deps.timers,
      clock: deps.clock,
      delaysMs: () => (this.inDoubt() ? (deps.recheckMs ?? 5_000) : (deps.pollMs ?? 2_000)),
      check: () => this.poll(),
      onChange: (recheck) => this.store.update({ recheck }),
    });
  }

  private get snapshot(): TillSaleSnapshot {
    return this.store.get();
  }

  add(itemId: MenuItemId): void {
    this.editTicket(addToTicket(this.snapshot.ticket, itemId));
  }

  remove(itemId: MenuItemId): void {
    this.editTicket(removeFromTicket(this.snapshot.ticket, itemId));
  }

  clear(): void {
    this.editTicket(emptyTicket);
  }

  /** "Show QR": the ticket becomes an order. Safe to tap again after a failure. */
  async ringUp(): Promise<void> {
    const { ticket, sale, pending, sessionExpired } = this.snapshot;
    if (sale || pending || sessionExpired || ticket.length === 0) return;
    this.ringUpKey ??= asIdempotencyKey(this.deps.ids.uuid());
    const order = await this.createOrder('ringUp', ticket, this.ringUpKey);
    if (!order) return;
    this.ringUpKey = null;
    this.saleStartedAt = this.deps.clock.now().getTime();
    this.begin(order);
  }

  /**
   * A new code after the old one expired. Zahln can't renew an order, so this
   * rings up the same items again; the old order is watched until the server
   * says it expired, in case it was paid at the last second.
   */
  async newCode(): Promise<void> {
    const { sale, pending } = this.snapshot;
    if (sale?.step !== 'expired' || pending) return;
    this.newCodeKey ??= asIdempotencyKey(this.deps.ids.uuid());
    const order = await this.createOrder('newCode', orderLines(sale.order), this.newCodeKey);
    if (!order || this.snapshot.sale !== sale) return;
    this.newCodeKey = null;
    this.leave(sale.order);
    this.begin(order);
  }

  /** After a decline, the same code can be paid again until it expires. */
  showCodeAgain(): void {
    this.dispatch({ type: 'showCodeAgain' });
  }

  /**
   * "Cancel order". Zahln can't cancel one, so the sale is set aside: the till
   * goes back to the ticket and the order is watched until it expires.
   * Refused while a payment is in doubt.
   */
  setAside(): void {
    const { sale, pending } = this.snapshot;
    if (!sale || pending || !canSetAside(sale)) return;
    this.deps.telemetry.event('till.sale_set_aside', { orderId: sale.order.id, step: sale.step });
    this.leave(sale.order);
    this.poller.reset();
    this.clearQrTimer();
    this.store.update({ sale: null, problem: null });
  }

  /** "Check now" while the outcome is in doubt. */
  checkNow(): void {
    if (this.snapshot.sale && !isSaleFinished(this.snapshot.sale)) void this.poller.runNow();
  }

  /** "Next order": only once the sale is paid. */
  next(): void {
    const { sale } = this.snapshot;
    if (sale && !isSaleFinished(sale)) return;
    this.poller.reset();
    this.clearQrTimer();
    this.store.update({ sale: null, ticket: emptyTicket, problem: null });
  }

  /** The cashier signed in again: carry on with the same ticket or order. */
  sessionRenewed(): void {
    this.store.update({ sessionExpired: false, problem: null });
    this.checkNow();
  }

  dismissProblem(): void {
    this.store.update({ problem: null });
  }

  dispose(): void {
    this.poller.reset();
    this.clearQrTimer();
    this.store.clearListeners();
  }

  private editTicket(ticket: Ticket): void {
    if (this.snapshot.sale || this.snapshot.pending) return;
    // A different ticket is a different order; a new key keeps them apart.
    this.ringUpKey = null;
    this.store.update({ ticket, problem: null });
  }

  private async createOrder(action: TillAction, lines: Ticket, idempotencyKey: IdempotencyKey): Promise<Order | null> {
    this.store.update({ pending: action, problem: null });
    const result = await this.deps.orders.create({ lines, idempotencyKey });
    this.store.update({ pending: null });
    if (result.ok) return result.value;
    this.fail(action, result.error);
    return null;
  }

  private begin(order: Order): void {
    this.shownDeclines.clear();
    this.deps.telemetry.event('till.order_created', { orderId: order.id, tillId: order.till.id });
    this.setSale(startSale(order));
    this.poller.reset();
    this.poller.schedule();
  }

  /** An order the till stops showing before the server settled it is handed to the watch. */
  private leave(order: Order): void {
    if (order.status !== 'expired' && order.status !== 'paid') this.deps.setAside.watch(order);
  }

  /** One status check. True while the sale can still change, so polling goes on. */
  private async poll(): Promise<boolean> {
    const { sale, sessionExpired } = this.snapshot;
    if (!sale || isSaleSettled(sale) || sessionExpired) return false;
    const read = await this.deps.orders.get({ orderId: sale.order.id });
    if (!read.ok) return this.unavailable(read.error);
    this.dispatch({ type: 'orderSeen', order: read.value });

    const now = this.snapshot.sale;
    if (!now) return false;
    const held = 'payment' in now ? now.payment : undefined;
    // The order names its payment; read it unless its outcome is already known
    // here. After a decline the order names none, so a payment the till is
    // still checking is read by its own ID.
    const paymentId = now.order.paymentId ?? (held && !isSettled(held.status) ? held.id : null);
    if (paymentId && !(held?.id === paymentId && isSettled(held.status))) {
      const payment = await this.deps.payments.get(paymentId);
      if (!payment.ok) return this.unavailable(payment.error);
      this.dispatch({ type: 'paymentSeen', payment: payment.value });
    } else if (!paymentId && now.order.status === 'open' && now.order.version > sale.order.version) {
      // Open again, yet changed: a payment was tried and declined between two
      // polls. The order doesn't say which, so look it up by order ID.
      await this.findDecline(now.order.id);
    }
    const after = this.snapshot.sale;
    return after !== null && !isSaleSettled(after);
  }

  private async findDecline(orderId: Order['id']): Promise<void> {
    const found = await this.deps.payments.list({ search: orderId, status: 'declined', limit: 5 });
    if (!found.ok) return;
    const decline = found.value.items.find((p) => p.orderId === orderId && !this.shownDeclines.has(p.id));
    if (decline) this.dispatch({ type: 'paymentSeen', payment: decline });
  }

  private unavailable(error: GatewayError): boolean {
    if (this.isUnauthorized(error)) {
      this.store.update({ sessionExpired: true });
      return false;
    }
    const { sale } = this.snapshot;
    this.deps.telemetry.event('till.status_unavailable', { orderId: sale?.order.id, cause: error.cause });
    this.dispatch({ type: 'statusUnavailable' });
    return true;
  }

  private dispatch(event: TillSaleEvent): boolean {
    const { sale } = this.snapshot;
    if (!sale) return false;
    const next = tillSaleTransition(sale, event);
    if (next === sale) return false;
    this.setSale(next);
    return true;
  }

  private setSale(next: TillSaleState): void {
    const wasInDoubt = this.inDoubt();
    if (next.step === 'declined') this.shownDeclines.add(next.payment.id);
    this.store.update({ sale: next });
    // "Checked N times" counts from the moment the outcome came into doubt.
    if (wasInDoubt !== this.inDoubt()) {
      this.poller.reset();
      this.poller.schedule();
    }
    this.syncQrTimer(next);
    if (isSaleSettled(next)) this.finish(next);
  }

  private finish(sale: TillSaleState): void {
    this.poller.reset();
    this.clearQrTimer();
    this.newCodeKey = null;
    this.deps.telemetry.event('till.sale_finished', {
      outcome: sale.step,
      orderId: sale.order.id,
      durationMs: this.deps.clock.now().getTime() - this.saleStartedAt,
    });
  }

  private inDoubt(): boolean {
    return this.snapshot.sale?.step === 'checking';
  }

  /** While the code can be paid, expire it on time by the server's clock; the server's own word follows by polling. */
  private syncQrTimer(sale: TillSaleState): void {
    if (sale.step !== 'awaiting' && sale.step !== 'declined') return this.clearQrTimer();
    if (this.qrTimer?.expiresAt === sale.order.expiresAt) return;
    this.clearQrTimer();
    const ms = Math.max(0, Date.parse(sale.order.expiresAt) - this.deps.serverClock.now().getTime());
    const handle = this.deps.timers.set(() => {
      this.qrTimer = null;
      this.dispatch({ type: 'qrExpired' });
    }, ms);
    this.qrTimer = { handle, expiresAt: sale.order.expiresAt };
  }

  private clearQrTimer(): void {
    if (!this.qrTimer) return;
    this.deps.timers.clear(this.qrTimer.handle);
    this.qrTimer = null;
  }

  private fail(action: TillAction, error: GatewayError): void {
    if (this.isUnauthorized(error)) {
      this.store.update({ sessionExpired: true });
      return;
    }
    const reason: TillProblem['reason'] =
      error.kind === 'outcome_unknown'
        ? 'unknown'
        : error.cause === 'offline'
          ? 'offline'
          : error.cause === 'rejected'
            ? 'refused'
            : 'busy';
    this.store.update({ problem: { action, reason } });
  }

  private isUnauthorized(error: GatewayError): boolean {
    return error.kind === 'not_processed' && error.cause === 'unauthorized';
  }
}

