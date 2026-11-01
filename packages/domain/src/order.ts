import type { MensaId, MenuItemId, OrderId, PaymentId, TillId } from './ids';
import type { Money } from './money';
import type { PriceGroup, PriceList } from './pricing';

/** Text the server gives in both languages, such as a dish name. */
export interface LocalizedText {
  readonly de: string;
  readonly en: string;
}

/** A mensa or till as orders and payments name it. */
export interface Ref<Id extends string> {
  readonly id: Id;
  readonly name: string;
}

/** One till, as the server names it ("Kasse 1"). A cashier login belongs to exactly one. */
export type Till = Ref<TillId>;

export interface MenuItem {
  readonly id: MenuItemId;
  readonly name: LocalizedText;
  readonly prices: PriceList;
}

export interface Mensa {
  readonly id: MensaId;
  readonly name: string;
  readonly city: string;
  readonly tills: readonly Till[];
  readonly menu: readonly MenuItem[];
}

/** One line of a ticket or of a new order: what and how many, no price. */
export interface OrderLine {
  readonly itemId: MenuItemId;
  readonly quantity: number;
}

/**
 * - open:    can be paid
 * - paying:  a payment for it is being checked
 * - paid:    a payment for it was confirmed
 * - expired: past `expiresAt`, unpaid; it can never be paid
 */
export type OrderStatus = 'open' | 'paying' | 'paid' | 'expired';

export interface OrderItem {
  readonly itemId: MenuItemId;
  readonly name: LocalizedText;
  readonly quantity: number;
  readonly unitPrices: PriceList;
}

/**
 * What the cashier rang up, as the till sees it. It has a total for every
 * price group, because the till can't know who will pay.
 */
export interface Order {
  readonly id: OrderId;
  readonly status: OrderStatus;
  readonly mensa: Ref<MensaId>;
  readonly till: Till;
  readonly items: readonly OrderItem[];
  readonly amounts: PriceList;
  /** Shown as the QR code. It names the order, never an amount. */
  readonly qrPayload: string;
  /** The payment being checked or that paid the order. */
  readonly paymentId: PaymentId | null;
  readonly createdAt: string;
  /** Until when the order can be paid, in server time. */
  readonly expiresAt: string;
  /** Grows with every change; a lower version is an out-of-date read. */
  readonly version: number;
}

/** What the till's QR code carries: a reference to the order, never an amount. */
export interface OrderRef {
  readonly orderId: OrderId;
}

export interface QuoteLine {
  readonly itemId: MenuItemId;
  readonly name: LocalizedText;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly total: Money;
}

/**
 * The same order as one payer sees it: priced for their group by the server.
 * The student confirms exactly this total; the server refuses any other.
 */
export interface Quote {
  readonly orderId: OrderId;
  readonly status: OrderStatus;
  readonly mensa: Ref<MensaId>;
  readonly till: Till;
  readonly priceGroup: PriceGroup;
  readonly lines: readonly QuoteLine[];
  readonly total: Money;
  /** This payer's own payment for the order, if they already made one. */
  readonly paymentId: PaymentId | null;
  readonly expiresAt: string;
  readonly version: number;
}

export function isQuoteExpired(quote: Quote, now: Date): boolean {
  return quote.status === 'expired' || Date.parse(quote.expiresAt) <= now.getTime();
}

/** The lines to ring up the same order again, e.g. for a new code after it expired. */
export function orderLines(order: Order): readonly OrderLine[] {
  return order.items.map(({ itemId, quantity }) => ({ itemId, quantity }));
}
