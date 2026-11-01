import { isSettled, newer, type Order, type OrderId, type Payment, type PaymentId } from '@zahln/domain';

import type { OrdersPort, PaymentsPort, Telemetry, Timers } from './ports';
import { Store } from './store';

/** A set-aside order that was paid after all. The cashier should refund it. */
export interface LatePayment {
  readonly order: Order;
  readonly payment: Payment;
}

export interface SetAsideSnapshot {
  readonly watching: number;
  readonly latePayments: readonly LatePayment[];
}

/** Where the till hands an order it leaves before the server has settled it. */
export interface OrderWatch {
  watch(order: Order): void;
}

export interface SetAsideDeps {
  readonly orders: OrdersPort;
  readonly payments: PaymentsPort;
  readonly timers: Timers;
  readonly telemetry: Telemetry;
  /** How often to read each watched order. Slow: these are rare and nobody waits on them. */
  readonly pollMs?: number;
}

/**
 * Zahln's API can't cancel an order: its code stays payable until it expires.
 * An order the cashier sets aside is therefore read until the server says it
 * expired. If it was paid instead, it is raised as a late payment, so the
 * money never goes unnoticed.
 */
export class SetAsideOrders implements OrderWatch {
  private readonly store = new Store<SetAsideSnapshot>({ watching: 0, latePayments: [] });
  private readonly deps: SetAsideDeps;
  private readonly watched = new Map<OrderId, Order>();
  private timer: unknown = null;
  private running = false;

  readonly subscribe = this.store.subscribe;
  readonly getSnapshot = this.store.get;

  constructor(deps: SetAsideDeps) {
    this.deps = deps;
  }

  watch(order: Order): void {
    if (order.status === 'expired') return;
    this.watched.set(order.id, newer(this.watched.get(order.id), order));
    this.deps.telemetry.event('till.order_set_aside', { orderId: order.id });
    this.publish();
    this.schedule();
  }

  /** The cashier has seen the late payment (and refunded it, or chose not to). */
  dismiss(paymentId: PaymentId): void {
    this.store.update({ latePayments: this.store.get().latePayments.filter((late) => late.payment.id !== paymentId) });
  }

  dispose(): void {
    if (this.timer !== null) this.deps.timers.clear(this.timer);
    this.timer = null;
    this.store.clearListeners();
  }

  private schedule(): void {
    if (this.timer !== null || this.running || this.watched.size === 0) return;
    this.timer = this.deps.timers.set(() => {
      this.timer = null;
      void this.checkAll();
    }, this.deps.pollMs ?? 10_000);
  }

  private async checkAll(): Promise<void> {
    this.running = true;
    try {
      for (const order of [...this.watched.values()]) await this.check(order);
    } finally {
      this.running = false;
      this.publish();
      this.schedule();
    }
  }

  private async check(known: Order): Promise<void> {
    const read = await this.deps.orders.get({ orderId: known.id });
    if (!read.ok) return;
    const order = newer(known, read.value);
    this.watched.set(order.id, order);
    if (order.status === 'expired') {
      this.watched.delete(order.id);
      return;
    }
    if (!order.paymentId) return;
    const payment = await this.deps.payments.get(order.paymentId);
    if (!payment.ok || !isSettled(payment.value.status)) return;
    if (payment.value.status === 'confirmed') {
      this.watched.delete(order.id);
      this.deps.telemetry.event('till.set_aside_paid', { orderId: order.id, paymentId: payment.value.id });
      this.store.update({ latePayments: [...this.store.get().latePayments, { order, payment: payment.value }] });
    }
    // Declined: the order is open again and may still be paid; keep reading it.
  }

  private publish(): void {
    this.store.update({ watching: this.watched.size });
  }
}
