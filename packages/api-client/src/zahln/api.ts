import { ok, type MensasPort, type OrdersPort, type Outcome, type PaymentQuery, type PaymentsPort, type QuotesPort, type RefundsPort, type ReportsPort } from '@zahln/application';

import { createHttpClient, type HttpClient, type HttpClientOptions } from '../http-client';

import { CashierOrderSchema, DomainDailyTotalsSchema, DomainPaymentDetailSchema, DomainPaymentSchema, DomainRefundSchema, MensasSchema, QuoteSchema, toPayment } from './mappers';
import { AppConfigSchema, PaymentPageSchema } from './schemas';
import { ServerClock } from './server-clock';
import { ZahlnSession } from './session';

export interface ZahlnApiOptions extends Pick<HttpClientOptions, 'fetch' | 'isOnline' | 'timeoutMs' | 'maxAttempts' | 'sleep' | 'random'> {
  readonly baseUrl: string;
  /** Keeps this candidate's data apart on Zahln's test server. Sent with every request. */
  readonly candidateId: string;
  /** Sent with payments; Zahln refuses versions below `minAppVersion` with 426. */
  readonly appVersion: string;
  readonly newRequestId: () => string;
  /** Device time in ms; the server's time is derived from it. */
  readonly now?: () => number;
}

/** What `GET /config` says; matches `RemoteConfig` in @zahln/config. */
export interface ZahlnConfig {
  readonly minimumVersion: string;
  readonly paymentsEnabled: boolean;
}

export interface ZahlnApi {
  /** The server's time, learned from its responses. Use it for anything that expires. */
  readonly clock: ServerClock;
  readonly session: ZahlnSession;
  readonly config: { load(): Promise<Outcome<ZahlnConfig>> };
  readonly mensas: MensasPort;
  readonly quotes: QuotesPort;
  readonly orders: OrdersPort;
  readonly payments: PaymentsPort;
  readonly refunds: RefundsPort;
  /** Finance only. */
  readonly reports: ReportsPort;
}

const id = encodeURIComponent;

/** Zahln's Mensa API behind the application ports (spec: docs/api/openapi.json). */
export function createZahlnApi(options: ZahlnApiOptions): ZahlnApi {
  const now = options.now ?? Date.now;
  const clock = new ServerClock(now);
  const session: ZahlnSession = new ZahlnSession(() => client, clock);
  const client: HttpClient = createHttpClient({
    ...options,
    now,
    headers: { 'X-Candidate-Id': options.candidateId, 'X-App-Version': options.appVersion },
    session,
    onServerTime: (sample) => clock.observe(sample),
  });

  const payments: PaymentsPort = {
    submit: (intent) =>
      client.request({
        method: 'POST',
        path: `/orders/${id(intent.quote.orderId)}/payments`,
        // The amount the student saw; Zahln refuses the payment if the order now costs something else.
        body: { amountCents: intent.quote.total.cents },
        idempotencyKey: intent.idempotencyKey,
        schema: DomainPaymentSchema,
      }),
    get: (paymentId) => client.request({ method: 'GET', path: `/payments/${id(paymentId)}`, schema: DomainPaymentDetailSchema }),
    list: async (query: PaymentQuery) => {
      const page = await client.request({ method: 'GET', path: '/payments', query: listQuery(query), schema: PaymentPageSchema });
      return page.ok ? ok({ items: page.value.items.map(toPayment), nextCursor: page.value.nextCursor }) : page;
    },
  };

  return {
    clock,
    session,
    config: {
      load: async () => {
        const config = await client.request({ method: 'GET', path: '/config', schema: AppConfigSchema, authenticated: false });
        return config.ok ? ok({ minimumVersion: config.value.minAppVersion, paymentsEnabled: config.value.paymentsEnabled }) : config;
      },
    },
    mensas: { list: () => client.request({ method: 'GET', path: '/mensas', schema: MensasSchema }) },
    quotes: { getQuote: (orderRef) => client.request({ method: 'GET', path: `/orders/${id(orderRef.orderId)}`, schema: QuoteSchema }) },
    orders: {
      create: (input) =>
        client.request({
          method: 'POST',
          path: '/orders',
          body: { items: input.lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity })) },
          idempotencyKey: input.idempotencyKey,
          schema: CashierOrderSchema,
        }),
      get: (orderRef) => client.request({ method: 'GET', path: `/orders/${id(orderRef.orderId)}`, schema: CashierOrderSchema }),
    },
    payments,
    refunds: {
      refund: (request) =>
        client.request({
          method: 'POST',
          path: `/payments/${id(request.paymentId)}/refunds`,
          body: { amountCents: request.amount.cents, reason: request.reason },
          idempotencyKey: request.idempotencyKey,
          schema: DomainRefundSchema,
        }),
    },
    reports: {
      dailyTotals: (date) => client.request({ method: 'GET', path: '/reports/daily-totals', query: { date }, schema: DomainDailyTotalsSchema }),
    },
  };
}

function listQuery(query: PaymentQuery): Record<string, string | number | undefined> {
  return {
    mensaId: query.mensaId,
    tillId: query.tillId,
    status: query.status,
    from: query.from,
    to: query.to,
    needsAttention: query.needsAttention === undefined ? undefined : String(query.needsAttention),
    q: query.search,
    cursor: query.cursor,
    limit: query.limit,
  };
}
