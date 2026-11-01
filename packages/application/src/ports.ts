import type {
  DailyTotals,
  IdempotencyKey,
  Mensa,
  MensaId,
  Money,
  Order,
  OrderLine,
  OrderRef,
  Payment,
  PaymentDetail,
  PaymentId,
  PaymentIntent,
  PaymentStatus,
  Quote,
  Refund,
  RefundReason,
  TillId,
  User,
} from '@zahln/domain';

import type { Outcome } from './gateway-error';

// ── Server ports: implemented by the Zahln API adapters (@zahln/api-client) ──

/** One of Zahln's seeded test logins. */
export interface Credentials {
  readonly username: string;
  readonly password: string;
}

export interface SessionPort {
  /** Refused with `invalid_credentials`. The session renews itself when the server ends it. */
  signIn(credentials: Credentials): Promise<Outcome<User>>;
  signOut(): void;
}

export interface MensasPort {
  /** Mensas with their tills and menus. Rarely changes. */
  list(): Promise<Outcome<readonly Mensa[]>>;
}

export interface QuotesPort {
  /** The order as the signed-in payer sees it, priced for their group by the server. */
  getQuote(orderRef: OrderRef): Promise<Outcome<Quote>>;
}

export interface PaymentsPort {
  /**
   * Pays the quote's total. Idempotent by the intent's key: sending it again
   * returns the payment it made, so it can be repeated to learn a lost outcome.
   */
  submit(intent: PaymentIntent): Promise<Outcome<Payment>>;
  get(id: PaymentId): Promise<Outcome<PaymentDetail>>;
  /** Newest first. The server shows each role only what it may see. */
  list(query: PaymentQuery): Promise<Outcome<Page<Payment>>>;
}

export interface OrdersPort {
  /** Rings up an order at the signed-in cashier's till. Idempotent by key. */
  create(input: NewOrder): Promise<Outcome<Order>>;
  /** The till polls this for the order's status and its payment. */
  get(orderRef: OrderRef): Promise<Outcome<Order>>;
}

export interface RefundsPort {
  /**
   * Idempotent by `request.idempotencyKey`: sending the same request again
   * returns the refund already made. Refusals carry a code such as
   * `refund_exceeds_payment` (see `refundRefusalFor`).
   */
  refund(request: RefundRequest): Promise<Outcome<Refund>>;
}

/** Finance reports. */
export interface ReportsPort {
  /** One day's totals per mensa and till; today when `date` (YYYY-MM-DD, Europe/Berlin) is left out. */
  dailyTotals(date?: string): Promise<Outcome<DailyTotals>>;
}

export interface NewOrder {
  readonly lines: readonly OrderLine[];
  readonly idempotencyKey: IdempotencyKey;
}

export interface RefundRequest {
  readonly paymentId: PaymentId;
  readonly amount: Money;
  readonly reason: RefundReason;
  readonly idempotencyKey: IdempotencyKey;
}

export interface PaymentQuery {
  readonly mensaId?: MensaId;
  readonly tillId?: TillId;
  readonly status?: PaymentStatus;
  /** ISO 8601 with offset; created at or after. */
  readonly from?: string;
  /** ISO 8601 with offset; created before. */
  readonly to?: string;
  readonly needsAttention?: boolean;
  /** A payment, order or payer ID, or the start of one. */
  readonly search?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

// ── Device ports: implemented per platform (adapters-native, adapters-web) ──

/** Survives app restarts. Holds intents whose outcome is not settled yet. */
export interface PaymentIntentStore {
  save(intent: PaymentIntent): Promise<void>;
  get(key: IdempotencyKey): Promise<PaymentIntent | null>;
  listUnsettled(): Promise<readonly PaymentIntent[]>;
  remove(key: IdempotencyKey): Promise<void>;
}

export type AuthenticationResult = 'authorized' | 'cancelled' | 'unavailable' | 'locked_out';

/** Biometrics only. The app PIN is the fallback, handled by the PIN use case. */
export interface Authenticator {
  /** True when the device has biometrics and the user has enrolled them. */
  isAvailable(): Promise<boolean>;
  authenticate(prompt: { readonly title: string; readonly cancelLabel: string }): Promise<AuthenticationResult>;
}

/** Whether the device has a connection. Paying needs one; nothing is queued offline. */
export interface Connectivity {
  isOnline(): boolean;
  subscribe(listener: (online: boolean) => void): () => void;
}

export interface SecureStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Hasher {
  /** Hex SHA-256 of the UTF-8 text. */
  sha256(text: string): Promise<string>;
}

export interface Clock {
  now(): Date;
}

/** Timer functions of the platform, injected so the application layer stays runtime-free and testable. */
export interface Timers {
  set(callback: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export interface IdGenerator {
  /** Cryptographically random UUID. */
  uuid(): string;
}

export interface Telemetry {
  event(name: string, properties?: Readonly<Record<string, unknown>>): void;
  error(error: unknown, context?: Readonly<Record<string, unknown>>): void;
}
