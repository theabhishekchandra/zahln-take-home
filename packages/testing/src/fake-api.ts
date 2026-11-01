import type { ZahlnSchemas } from '@zahln/api-client';
import type { Clock } from '@zahln/application';
import { orderQrPayload, type OrderId } from '@zahln/domain';

import { MENSAS, USERS, userIdFor, type ApiMensa, type ApiUser } from './seed';

type S = ZahlnSchemas['schemas'];
type PriceGroup = 'student' | 'staff' | 'guest';

export type Route = 'login' | 'config' | 'mensas' | 'createOrder' | 'getOrder' | 'pay' | 'listPayments' | 'getPayment' | 'refund';

/** What goes wrong with one request, as Zahln's spec says its server behaves. */
export type Fault =
  | 'none'
  /** No connection: the request never arrives. */
  | 'network'
  /** 503 `unavailable`, before anything happens. */
  | 'unavailable'
  /** Handled and saved, then 502 `connection_dropped`. */
  | 'drop'
  /** Handled and saved, then 504 `timeout`. */
  | 'timeout'
  /** Handled and saved, then no response at all. */
  | 'lost'
  /** A GET answers with the version before the current one. */
  | 'stale'
  /** 401 `session_expired`: the token ends now. */
  | 'session_expired';

/** A payment's outcome once it is checked. `pending` keeps it pending until decided otherwise. */
export type Decision = 'confirmed' | 'declined' | 'pending';

export interface FakeZahlnApiOptions {
  /** The server's clock. Defaults to `Date`, so fake timers move it. */
  readonly clock?: Clock;
  readonly faults?: (route: Route) => Fault;
  /** Each new payment's outcome. Defaults to confirmed. */
  readonly decide?: (payment: S['Payment']) => Decision;
  /** Each new refund's outcome. Defaults to completed. */
  readonly decideRefund?: (refund: S['Refund']) => 'completed' | 'failed' | 'pending';
  /** How long a payment or refund stays pending before it is decided. */
  readonly checkMs?: number;
}

const ORDER_TTL_MS = 5 * 60_000;
const TOKEN_TTL_MS = 5 * 60_000;
const REFUND_WINDOW_MS = 30 * 86_400_000;
const PENDING_TOO_LONG_MS = 2 * 60_000;

interface OrderRecord {
  readonly id: string;
  readonly mensa: ApiMensa;
  readonly tillId: string;
  readonly lines: readonly { readonly itemId: string; readonly quantity: number }[];
  readonly createdAt: string;
  readonly expiresAt: string;
  status: S['Order']['status'];
  paymentId: string | null;
  version: number;
}

interface PaymentRecord {
  readonly id: string;
  readonly order: OrderRecord;
  readonly payer: ApiUser;
  readonly priceGroup: PriceGroup;
  readonly amountCents: number;
  readonly createdAt: string;
  status: S['Payment']['status'];
  decideAt: number;
  refunds: RefundRecord[];
  history: S['PaymentEvent'][];
  updatedAt: string;
  version: number;
}

interface RefundRecord {
  readonly id: string;
  readonly amountCents: number;
  readonly reason: string | null;
  readonly createdAt: string;
  status: S['Refund']['status'];
  decideAt: number;
  updatedAt: string;
}

interface Answer {
  readonly status: number;
  readonly body: unknown;
}

class Refusal extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;

  constructor(status: number, code: string, retryable = false) {
    super(code);
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

/**
 * Zahln's Mensa API in memory, behind `fetch`: the contract of
 * docs/api/openapi.json, with the faults the spec warns about. Tests run the
 * real HTTP adapters and controllers against it, so they never call the live
 * test server.
 */
export class FakeZahlnApi {
  readonly fetch: typeof globalThis.fetch;
  paymentsEnabled = true;
  minAppVersion = '1.0.0';

  private readonly clock: Clock;
  private readonly options: FakeZahlnApiOptions;
  private readonly tokens = new Map<string, { readonly user: ApiUser; readonly expiresAt: number }>();
  private readonly orders = new Map<string, OrderRecord>();
  private readonly payments = new Map<string, PaymentRecord>();
  /** What each record looked like one change ago, for stale reads. */
  private readonly previous = new Map<string, unknown>();
  private readonly replies = new Map<string, { readonly body: string; readonly answer: Answer }>();
  private counter = 0;

  constructor(options: FakeZahlnApiOptions = {}) {
    this.options = options;
    this.clock = options.clock ?? { now: () => new Date() };
    this.fetch = ((input: string | URL, init?: RequestInit) => this.handle(String(input), init ?? {})) as typeof globalThis.fetch;
  }

  /** Ends every session, as the server may at any time. */
  endSessions(): void {
    this.tokens.clear();
  }

  /** Every payment made for an order, in any status. */
  paymentsFor(orderId: OrderId | string): readonly S['Payment'][] {
    this.advance();
    return [...this.payments.values()].filter((p) => p.order.id === orderId).map((p) => this.paymentView(p));
  }

  /** Decides a payment that is still pending, as the server's check eventually does. */
  settlePayment(paymentId: string, decision: 'confirmed' | 'declined'): void {
    const payment = this.payments.get(paymentId);
    if (payment?.status !== 'pending') throw new Error(`Payment ${paymentId} is not pending`);
    this.applyDecision(payment, decision);
  }

  /** How many orders a till has rung up. */
  orderCount(tillId: string): number {
    return [...this.orders.values()].filter((o) => o.tillId === tillId).length;
  }

  /** Refunds made for a payment, in any status. */
  refundsFor(paymentId: string): readonly S['Refund'][] {
    this.advance();
    const payment = this.payments.get(paymentId);
    return payment ? payment.refunds.map((r) => this.refundView(payment, r)) : [];
  }

  /** A settled payment in the history, e.g. one made days ago, to refund in a test. */
  seedPayment(input: {
    readonly tillId: string;
    readonly payer: 'student' | 'staff' | 'guest';
    readonly status: 'confirmed' | 'declined' | 'pending';
    readonly createdAt: Date;
    readonly items?: readonly { readonly itemId: string; readonly quantity: number }[];
  }): S['Payment'] {
    const mensa = MENSAS.find((m) => m.tills.some((t) => t.id === input.tillId));
    if (!mensa) throw new Error(`No till ${input.tillId}`);
    const payer = this.user(input.payer);
    const order = this.newOrder(mensa, input.tillId, input.items ?? [{ itemId: mensa.menu[0]!.id, quantity: 1 }], input.createdAt);
    const payment = this.newPayment(order, payer, input.createdAt);
    payment.status = input.status;
    payment.decideAt = Infinity;
    order.status = input.status === 'confirmed' ? 'paid' : input.status === 'pending' ? 'paying' : 'expired';
    order.paymentId = input.status === 'declined' ? null : payment.id;
    return this.paymentView(payment);
  }

  // ── HTTP ──

  private async handle(url: string, init: RequestInit): Promise<Response> {
    const method = init.method ?? 'GET';
    const { pathname, searchParams } = new URL(url);
    const headers = (init.headers ?? {}) as Record<string, string>;
    const match = this.route(method, pathname);
    if (!match) return this.respond({ status: 404, body: problem(404, 'not_found') });

    const fault = this.options.faults?.(match.route) ?? 'none';
    if (fault === 'network') throw new TypeError('Network request failed');
    if (fault === 'unavailable') return this.respond({ status: 503, body: problem(503, 'unavailable', true) });

    let answer: Answer;
    try {
      const user = match.route === 'login' || match.route === 'config' ? null : this.authenticate(headers, fault);
      this.advance();
      const body = typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
      const run = () => this.dispatch(match, user, body, searchParams, headers, fault === 'stale');
      answer = method === 'POST' && user ? this.idempotent(user, headers['Idempotency-Key'], init.body, run) : run();
    } catch (error) {
      if (!(error instanceof Refusal)) throw error;
      answer = { status: error.status, body: problem(error.status, error.code, error.retryable) };
    }

    // The change is saved; only the answer goes missing.
    if (fault === 'drop') return this.respond({ status: 502, body: problem(502, 'connection_dropped', true) });
    if (fault === 'timeout') return this.respond({ status: 504, body: problem(504, 'timeout', true) });
    if (fault === 'lost') throw new TypeError('Network request failed');
    return this.respond(answer);
  }

  private route(method: string, path: string): { readonly route: Route; readonly id?: string } | null {
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const [a, b, c] = parts;
    if (method === 'POST' && a === 'sessions' && parts.length === 1) return { route: 'login' };
    if (method === 'GET' && a === 'config' && parts.length === 1) return { route: 'config' };
    if (method === 'GET' && a === 'mensas' && parts.length === 1) return { route: 'mensas' };
    if (a === 'orders') {
      if (method === 'POST' && parts.length === 1) return { route: 'createOrder' };
      if (method === 'GET' && parts.length === 2) return { route: 'getOrder', id: b };
      if (method === 'POST' && c === 'payments' && parts.length === 3) return { route: 'pay', id: b };
    }
    if (a === 'payments') {
      if (method === 'GET' && parts.length === 1) return { route: 'listPayments' };
      if (method === 'GET' && parts.length === 2) return { route: 'getPayment', id: b };
      if (method === 'POST' && c === 'refunds' && parts.length === 3) return { route: 'refund', id: b };
    }
    return null;
  }

  private dispatch(
    match: { readonly route: Route; readonly id?: string },
    user: ApiUser | null,
    body: unknown,
    query: URLSearchParams,
    headers: Record<string, string>,
    stale: boolean,
  ): Answer {
    const id = match.id ?? '';
    switch (match.route) {
      case 'login':
        return this.login(body);
      case 'config':
        return { status: 200, body: { minAppVersion: this.minAppVersion, paymentsEnabled: this.paymentsEnabled } satisfies S['AppConfig'] };
      case 'mensas':
        return { status: 200, body: { items: [...MENSAS] } satisfies S['MensaList'] };
      case 'createOrder':
        return this.createOrder(need(user), body);
      case 'getOrder':
        return { status: 200, body: this.orderFor(need(user), this.findOrder(id), stale) };
      case 'pay':
        return this.pay(need(user), this.findOrder(id), body, headers['X-App-Version']);
      case 'listPayments':
        return { status: 200, body: this.list(need(user), query) };
      case 'getPayment':
        return { status: 200, body: this.detailFor(need(user), id, stale) };
      case 'refund':
        return this.refund(need(user), id, body);
    }
  }

  /** One answer per key and user: a repeat returns it again; another body under the key is refused. */
  private idempotent(user: ApiUser, key: string | undefined, body: unknown, run: () => Answer): Answer {
    if (!key) throw new Refusal(400, 'invalid_request');
    const slot = `${user.id}:${key}`;
    const text = typeof body === 'string' ? body : '';
    const known = this.replies.get(slot);
    if (known) {
      if (known.body !== text) throw new Refusal(422, 'idempotency_mismatch');
      return known.answer;
    }
    const answer = run();
    if (answer.status < 300) this.replies.set(slot, { body: text, answer });
    return answer;
  }

  private respond(answer: Answer): Response {
    return new Response(JSON.stringify(answer.body), {
      status: answer.status,
      headers: { 'Content-Type': answer.status < 300 ? 'application/json' : 'application/problem+json', Date: this.clock.now().toUTCString() },
    });
  }

  // ── Sessions ──

  private login(body: unknown): Answer {
    const { username, password } = (body ?? {}) as { username?: string; password?: string };
    const user = USERS.find((u) => u.id === userIdFor(username ?? ''));
    if (!user || password !== 'test1234') throw new Refusal(401, 'invalid_credentials');
    const token = `tok_${++this.counter}`;
    const expiresAt = this.now() + TOKEN_TTL_MS;
    this.tokens.set(token, { user, expiresAt });
    return { status: 201, body: { accessToken: token, tokenType: 'Bearer', expiresAt: new Date(expiresAt).toISOString(), user } satisfies S['Session'] };
  }

  private authenticate(headers: Record<string, string>, fault: Fault): ApiUser {
    const token = headers.Authorization?.replace(/^Bearer /, '') ?? '';
    const session = this.tokens.get(token);
    if (!session) throw new Refusal(401, token ? 'session_expired' : 'unauthorized', true);
    if (fault === 'session_expired' || session.expiresAt <= this.now()) {
      this.tokens.delete(token);
      throw new Refusal(401, 'session_expired', true);
    }
    return session.user;
  }

  // ── Orders and payments ──

  private createOrder(user: ApiUser, body: unknown): Answer {
    if (user.role !== 'cashier' || !user.tillId) throw new Refusal(403, 'forbidden');
    const mensa = MENSAS.find((m) => m.id === user.mensaId);
    const items = (body as { items?: { itemId: string; quantity: number }[] } | undefined)?.items;
    if (!mensa || !items?.length || items.some((i) => !mensa.menu.some((m) => m.id === i.itemId) || !(i.quantity >= 1))) {
      throw new Refusal(400, 'invalid_request');
    }
    const order = this.newOrder(mensa, user.tillId, items, this.clock.now());
    return { status: 201, body: this.cashierView(order) };
  }

  private pay(user: ApiUser, order: OrderRecord, body: unknown, appVersion: string | undefined): Answer {
    const group = user.priceGroup;
    if (!group) throw new Refusal(403, 'forbidden');
    if (!this.paymentsEnabled) throw new Refusal(503, 'payments_disabled');
    if (!appVersion || compareVersions(appVersion, this.minAppVersion) < 0) throw new Refusal(426, 'app_version_unsupported');
    if (order.status === 'expired') throw new Refusal(409, 'order_expired');
    if (order.status === 'paid') throw new Refusal(409, 'order_already_paid');
    if (order.status === 'paying') throw new Refusal(409, 'order_payment_in_progress', true);
    if ((body as { amountCents?: number } | undefined)?.amountCents !== this.amountFor(order, group)) throw new Refusal(409, 'amount_mismatch');
    const payment = this.newPayment(order, user, this.clock.now());
    return { status: 201, body: this.paymentView(payment) };
  }

  private refund(user: ApiUser, paymentId: string, body: unknown): Answer {
    const payment = this.payments.get(paymentId);
    if (!payment) throw new Refusal(404, 'not_found');
    if (user.role !== 'cashier' || user.tillId !== payment.order.tillId) throw new Refusal(403, 'forbidden');
    const { amountCents, reason } = (body ?? {}) as { amountCents?: number; reason?: string | null };
    if (!Number.isInteger(amountCents) || (amountCents ?? 0) <= 0) throw new Refusal(400, 'invalid_request');
    if (payment.status !== 'confirmed') throw new Refusal(422, 'payment_not_refundable');
    if (this.now() - Date.parse(payment.createdAt) >= REFUND_WINDOW_MS) throw new Refusal(422, 'refund_window_closed');
    if ((amountCents ?? 0) > refundable(payment)) throw new Refusal(409, 'refund_exceeds_payment');
    const at = this.clock.now().toISOString();
    const refund: RefundRecord = { id: this.id('ref'), amountCents: amountCents ?? 0, reason: reason ?? null, createdAt: at, status: 'pending', decideAt: this.now() + (this.options.checkMs ?? 0), updatedAt: at };
    this.change(payment, () => {
      payment.refunds.push(refund);
      payment.history.push({ at, type: 'refund_requested', amountCents: refund.amountCents, refundId: refund.id });
    });
    return { status: 201, body: this.refundView(payment, refund) };
  }

  private newOrder(mensa: ApiMensa, tillId: string, lines: OrderRecord['lines'], at: Date): OrderRecord {
    const order: OrderRecord = {
      id: this.id('ord'),
      mensa,
      tillId,
      lines: lines.map(({ itemId, quantity }) => ({ itemId, quantity })),
      createdAt: at.toISOString(),
      expiresAt: new Date(at.getTime() + ORDER_TTL_MS).toISOString(),
      status: 'open',
      paymentId: null,
      version: 1,
    };
    this.orders.set(order.id, order);
    return order;
  }

  private newPayment(order: OrderRecord, payer: ApiUser, at: Date): PaymentRecord {
    const group = payer.priceGroup as PriceGroup;
    const payment: PaymentRecord = {
      id: this.id('pay'),
      order,
      payer,
      priceGroup: group,
      amountCents: this.amountFor(order, group),
      createdAt: at.toISOString(),
      status: 'pending',
      decideAt: at.getTime() + (this.options.checkMs ?? 0),
      refunds: [],
      history: [{ at: at.toISOString(), type: 'payment_created', amountCents: this.amountFor(order, group), refundId: null }],
      updatedAt: at.toISOString(),
      version: 1,
    };
    this.payments.set(payment.id, payment);
    this.change(order, () => {
      order.status = 'paying';
      order.paymentId = payment.id;
    });
    return payment;
  }

  /** Moves time-driven state on: decisions that are due, orders past their expiry. */
  private advance(): void {
    const now = this.now();
    for (const payment of this.payments.values()) {
      if (payment.status === 'pending' && payment.decideAt <= now) this.decidePayment(payment);
      for (const refund of payment.refunds) {
        if (refund.status === 'pending' && refund.decideAt <= now) this.decideRefund(payment, refund);
      }
    }
    for (const order of this.orders.values()) {
      if (order.status === 'open' && Date.parse(order.expiresAt) <= now) this.change(order, () => (order.status = 'expired'));
    }
  }

  private decidePayment(payment: PaymentRecord): void {
    const decision = this.options.decide?.(this.paymentView(payment)) ?? 'confirmed';
    if (decision === 'pending') payment.decideAt = Infinity;
    else this.applyDecision(payment, decision);
  }

  private applyDecision(payment: PaymentRecord, decision: 'confirmed' | 'declined'): void {
    const at = this.clock.now().toISOString();
    this.change(payment, () => {
      payment.status = decision;
      payment.history.push({ at, type: decision === 'confirmed' ? 'payment_confirmed' : 'payment_declined', amountCents: null, refundId: null });
    });
    const { order } = payment;
    this.change(order, () => {
      // A declined payment frees the order for another try, and the order no longer names it.
      order.status = decision === 'confirmed' ? 'paid' : Date.parse(order.expiresAt) <= this.now() ? 'expired' : 'open';
      order.paymentId = decision === 'confirmed' ? payment.id : null;
    });
  }

  private decideRefund(payment: PaymentRecord, refund: RefundRecord): void {
    const decision = this.options.decideRefund?.(this.refundView(payment, refund)) ?? 'completed';
    if (decision === 'pending') {
      refund.decideAt = Infinity;
      return;
    }
    const at = this.clock.now().toISOString();
    this.change(payment, () => {
      refund.status = decision;
      refund.updatedAt = at;
      payment.history.push({ at, type: decision === 'completed' ? 'refund_completed' : 'refund_failed', amountCents: refund.amountCents, refundId: refund.id });
    });
  }

  // ── Views, as each role may see them ──

  private findOrder(id: string): OrderRecord {
    const order = this.orders.get(id);
    if (!order) throw new Refusal(404, 'not_found');
    return order;
  }

  private orderFor(user: ApiUser, order: OrderRecord, stale: boolean): S['Order'] {
    if (user.role === 'cashier' && user.tillId !== order.tillId) throw new Refusal(404, 'not_found');
    const shown = (stale && (this.previous.get(order.id) as OrderRecord | undefined)) || order;
    return user.priceGroup ? this.payerView(shown, user, user.priceGroup) : this.cashierView(shown);
  }

  private detailFor(user: ApiUser, id: string, stale: boolean): S['PaymentDetail'] {
    const current = this.payments.get(id);
    if (!current || (user.priceGroup && current.payer.id !== user.id)) throw new Refusal(404, 'not_found');
    if (user.role === 'cashier' && user.tillId !== current.order.tillId) throw new Refusal(403, 'forbidden');
    const payment = (stale && (this.previous.get(id) as PaymentRecord | undefined)) || current;
    return { ...this.paymentView(payment), refunds: payment.refunds.map((r) => this.refundView(payment, r)), history: [...payment.history] };
  }

  private list(user: ApiUser, query: URLSearchParams): S['PaymentPage'] {
    const q = query.get('q')?.toLowerCase();
    const from = query.get('from');
    const to = query.get('to');
    const matches = [...this.payments.values()]
      .filter((p) => (user.priceGroup ? p.payer.id === user.id : user.role === 'cashier' ? p.order.tillId === user.tillId : true))
      .map((p) => this.paymentView(p))
      .filter(
        (p) =>
          (!query.get('mensaId') || p.mensa.id === query.get('mensaId')) &&
          (!query.get('tillId') || p.till.id === query.get('tillId')) &&
          (!query.get('status') || p.status === query.get('status')) &&
          (!from || Date.parse(p.createdAt) >= Date.parse(from)) &&
          (!to || Date.parse(p.createdAt) < Date.parse(to)) &&
          (query.get('needsAttention') === null || String(p.needsAttention) === query.get('needsAttention')) &&
          (!q || [p.id, p.orderId, p.payer.id].some((v) => v.toLowerCase().startsWith(q))),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const offset = Number(query.get('cursor') ?? 0);
    const limit = Math.min(Number(query.get('limit') ?? 50), 200);
    return { items: matches.slice(offset, offset + limit), nextCursor: offset + limit < matches.length ? String(offset + limit) : null };
  }

  private cashierView(order: OrderRecord): S['Order'] {
    const group = (g: PriceGroup) => order.lines.reduce((sum, line) => sum + this.price(order, line.itemId, g) * line.quantity, 0);
    return {
      ...this.orderBase(order),
      items: order.lines.map((line) => ({ ...this.lineBase(order, line), unitPrices: this.item(order, line.itemId).prices, unitPriceCents: null })),
      amounts: { student: group('student'), staff: group('staff'), guest: group('guest') },
      priceGroup: null,
      amountCents: null,
      paymentId: order.paymentId,
    };
  }

  private payerView(order: OrderRecord, user: ApiUser, group: PriceGroup): S['Order'] {
    const own = order.paymentId && this.payments.get(order.paymentId)?.payer.id === user.id ? order.paymentId : null;
    return {
      ...this.orderBase(order),
      items: order.lines.map((line) => ({ ...this.lineBase(order, line), unitPrices: null, unitPriceCents: this.price(order, line.itemId, group) })),
      amounts: null,
      priceGroup: group,
      amountCents: this.amountFor(order, group),
      paymentId: own,
    };
  }

  private orderBase(order: OrderRecord) {
    const till = order.mensa.tills.find((t) => t.id === order.tillId)!;
    return {
      id: order.id,
      status: order.status,
      mensa: { id: order.mensa.id, name: order.mensa.name },
      till: { id: till.id, name: till.name },
      qrPayload: orderQrPayload(order.id as OrderId),
      currency: 'EUR' as const,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
      version: order.version,
    };
  }

  private lineBase(order: OrderRecord, line: OrderRecord['lines'][number]) {
    return { itemId: line.itemId, name: this.item(order, line.itemId).name, quantity: line.quantity };
  }

  private paymentView(p: PaymentRecord): S['Payment'] {
    const refunded = p.refunds.filter((r) => r.status === 'completed').reduce((sum, r) => sum + r.amountCents, 0);
    const pendingRefund = p.refunds.filter((r) => r.status === 'pending').reduce((sum, r) => sum + r.amountCents, 0);
    const attention: S['Payment']['attentionReasons'] = [];
    if (p.status === 'pending' && this.now() - Date.parse(p.createdAt) > PENDING_TOO_LONG_MS) attention.push('pending_too_long');
    if (p.refunds.some((r) => r.status === 'failed')) attention.push('refund_failed');
    const till = p.order.mensa.tills.find((t) => t.id === p.order.tillId)!;
    return {
      id: p.id,
      orderId: p.order.id,
      status: p.status,
      amountCents: p.amountCents,
      currency: 'EUR',
      priceGroup: p.priceGroup,
      mensa: { id: p.order.mensa.id, name: p.order.mensa.name },
      till: { id: till.id, name: till.name },
      payer: { id: p.payer.id, displayName: p.payer.displayName },
      items: p.order.lines.map((line) => ({ ...this.lineBase(p.order, line), unitPriceCents: this.price(p.order, line.itemId, p.priceGroup) })),
      refundedAmountCents: refunded,
      pendingRefundAmountCents: pendingRefund,
      refundableAmountCents: refundable(p),
      needsAttention: attention.length > 0,
      attentionReasons: attention,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      version: p.version,
    };
  }

  private refundView(payment: PaymentRecord, r: RefundRecord): S['Refund'] {
    return { id: r.id, paymentId: payment.id, amountCents: r.amountCents, currency: 'EUR', status: r.status, reason: r.reason, createdAt: r.createdAt, updatedAt: r.updatedAt };
  }

  // ── Helpers ──

  /** Applies a change, keeping the record as it was for stale reads and growing its version. */
  private change<T extends OrderRecord | PaymentRecord>(record: T, apply: () => void): void {
    this.previous.set(record.id, structuredClone(record));
    apply();
    record.version += 1;
    if ('updatedAt' in record) record.updatedAt = this.clock.now().toISOString();
  }

  private item(order: OrderRecord, itemId: string) {
    const item = order.mensa.menu.find((m) => m.id === itemId);
    if (!item) throw new Error(`No item ${itemId}`);
    return item;
  }

  private price(order: OrderRecord, itemId: string, group: PriceGroup): number {
    return this.item(order, itemId).prices[group];
  }

  private amountFor(order: OrderRecord, group: PriceGroup): number {
    return order.lines.reduce((sum, line) => sum + this.price(order, line.itemId, group) * line.quantity, 0);
  }

  private user(username: string): ApiUser {
    const user = USERS.find((u) => u.id === userIdFor(username));
    if (!user) throw new Error(`No user ${username}`);
    return user;
  }

  private id(prefix: string): string {
    return `${prefix}_${(++this.counter).toString(16).padStart(12, '0')}`;
  }

  private now(): number {
    return this.clock.now().getTime();
  }
}

function need(user: ApiUser | null): ApiUser {
  if (!user) throw new Refusal(401, 'unauthorized');
  return user;
}

function refundable(p: PaymentRecord): number {
  if (p.status !== 'confirmed') return 0;
  const taken = p.refunds.filter((r) => r.status !== 'failed').reduce((sum, r) => sum + r.amountCents, 0);
  return Math.max(0, p.amountCents - taken);
}

function problem(status: number, code: string, retryable = false): S['Problem'] {
  return { code, title: code.replace(/_/g, ' '), status, retryable, detail: null };
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
