import {
  asMensaId,
  asMenuItemId,
  asOrderId,
  asPaymentId,
  asRefundId,
  asTillId,
  asUserId,
  money,
  type DailyTotals,
  type Mensa,
  type Order,
  type Payment,
  type PaymentDetail,
  type PriceList,
  type Quote,
  type Refund,
  type User,
} from '@zahln/domain';
import { z } from 'zod';

import {
  DailyTotalsSchema,
  MensaListSchema,
  OrderSchema,
  PaymentDetailSchema,
  PaymentSchema,
  RefundSchema,
  UserSchema,
  type ApiDailyTotals,
  type ApiOrder,
  type ApiPayment,
  type ApiRefund,
  type ApiUser,
} from './schemas';

/**
 * From Zahln's wire format to the domain: cents become Money, IDs get their
 * brand. Each `*Schema` here validates and maps in one step, so a response
 * either becomes a domain value or is refused as invalid; nothing in between.
 */

const prices = (p: { student: number; staff: number; guest: number }): PriceList => ({
  student: money(p.student),
  staff: money(p.staff),
  guest: money(p.guest),
});

const ref = <Id extends string>(as: (value: string) => Id) => (r: { id: string; name: string }) => ({ id: as(r.id), name: r.name });
const mensaRef = ref(asMensaId);
const tillRef = ref(asTillId);

export function toUser(u: ApiUser): User {
  return {
    id: asUserId(u.id),
    name: u.displayName,
    role: u.role,
    priceGroup: u.priceGroup ?? null,
    tillId: u.tillId ? asTillId(u.tillId) : null,
    mensaId: u.mensaId ? asMensaId(u.mensaId) : null,
  };
}

export const DomainUserSchema = UserSchema.transform(toUser);

export const MensasSchema = MensaListSchema.transform(({ items }): readonly Mensa[] =>
  items.map((m) => ({
    id: asMensaId(m.id),
    name: m.name,
    city: m.city,
    tills: m.tills.map(tillRef),
    menu: m.menu.map((item) => ({ id: asMenuItemId(item.id), name: item.name, prices: prices(item.prices) })),
  })),
);

const orderBase = (o: ApiOrder) => ({
  status: o.status,
  mensa: mensaRef(o.mensa),
  till: tillRef(o.till),
  paymentId: o.paymentId ? asPaymentId(o.paymentId) : null,
  expiresAt: o.expiresAt,
  version: o.version,
});

/** The cashier's view: a total and unit prices for every price group. */
export const CashierOrderSchema = OrderSchema.transform((o, ctx): Order => {
  const amounts = o.amounts;
  const items = o.items.map((i) => (i.unitPrices ? { ...i, unitPrices: i.unitPrices } : null));
  if (!amounts || items.some((i) => i === null)) {
    ctx.addIssue({ code: 'custom', message: 'A cashier order needs prices for every group' });
    return z.NEVER;
  }
  return {
    ...orderBase(o),
    id: asOrderId(o.id),
    items: items.flatMap((i) => (i ? [{ itemId: asMenuItemId(i.itemId), name: i.name, quantity: i.quantity, unitPrices: prices(i.unitPrices) }] : [])),
    amounts: prices(amounts),
    qrPayload: o.qrPayload,
    createdAt: o.createdAt,
  };
});

/** The payer's view: the amount for their own price group. */
export const QuoteSchema = OrderSchema.transform((o, ctx): Quote => {
  const lines = o.items.map((i) => (i.unitPriceCents == null ? null : { ...i, unitPriceCents: i.unitPriceCents }));
  if (o.amountCents == null || !o.priceGroup || lines.some((l) => l === null)) {
    ctx.addIssue({ code: 'custom', message: "A payer's order needs their price group and amount" });
    return z.NEVER;
  }
  return {
    ...orderBase(o),
    orderId: asOrderId(o.id),
    priceGroup: o.priceGroup,
    lines: lines.flatMap((l) =>
      l
        ? [{ itemId: asMenuItemId(l.itemId), name: l.name, quantity: l.quantity, unitPrice: money(l.unitPriceCents), total: money(l.unitPriceCents * l.quantity) }]
        : [],
    ),
    total: money(o.amountCents),
  };
});

export function toPayment(p: ApiPayment): Payment {
  return {
    id: asPaymentId(p.id),
    orderId: asOrderId(p.orderId),
    status: p.status,
    amount: money(p.amountCents),
    priceGroup: p.priceGroup,
    mensa: mensaRef(p.mensa),
    till: tillRef(p.till),
    payer: { id: asUserId(p.payer.id), name: p.payer.displayName },
    items: p.items.map((i) => ({ itemId: i.itemId, name: i.name, quantity: i.quantity, unitPrice: money(i.unitPriceCents) })),
    refunded: money(p.refundedAmountCents),
    refundPending: money(p.pendingRefundAmountCents),
    refundable: money(p.refundableAmountCents),
    needsAttention: p.needsAttention,
    attentionReasons: p.attentionReasons,
    version: p.version,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function toRefund(r: ApiRefund): Refund {
  return {
    id: asRefundId(r.id),
    paymentId: asPaymentId(r.paymentId),
    amount: money(r.amountCents),
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export const DomainPaymentSchema = PaymentSchema.transform(toPayment);

export const DomainPaymentDetailSchema = PaymentDetailSchema.transform(
  (p): PaymentDetail => ({
    ...toPayment(p),
    refunds: p.refunds.map(toRefund),
    history: p.history.map((e) => ({
      at: e.at,
      type: e.type,
      amount: e.amountCents === null ? null : money(e.amountCents),
      refundId: e.refundId ? asRefundId(e.refundId) : null,
    })),
  }),
);

export const DomainRefundSchema = RefundSchema.transform(toRefund);

type ApiTotals = Pick<ApiDailyTotals, 'paymentCount' | 'grossCents' | 'refundedCents' | 'netCents' | 'pendingCount' | 'pendingCents'>;

const toTotals = (t: ApiTotals) => ({
  paymentCount: t.paymentCount,
  gross: money(t.grossCents),
  refunded: money(t.refundedCents),
  net: money(t.netCents),
  pendingCount: t.pendingCount,
  pending: money(t.pendingCents),
});

export const DomainDailyTotalsSchema = DailyTotalsSchema.transform(
  (d): DailyTotals => ({
    ...toTotals(d),
    date: d.date,
    mensas: d.mensas.map((m) => ({
      ...toTotals(m),
      mensa: { id: asMensaId(m.mensa.id), name: m.mensa.name },
      tills: m.tills.map((t) => ({ ...toTotals(t), till: { id: asTillId(t.till.id), name: t.till.name } })),
    })),
  }),
);
