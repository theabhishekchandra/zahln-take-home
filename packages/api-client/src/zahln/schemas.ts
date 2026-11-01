import { z } from 'zod';

import type { components } from '../generated/schema';

/**
 * Runtime checks for every response from Zahln's API. Each schema must
 * produce exactly the type generated from the OpenAPI spec (`npm run
 * generate`), so a change in the spec that the schemas miss fails to compile.
 */
type Api = components['schemas'];

const cents = z.number().int();
const priceGroup = z.enum(['student', 'staff', 'guest']);

export const RefSchema = z.object({ id: z.string(), name: z.string() }) satisfies z.ZodType<Api['Ref']>;
const LocalizedText = z.object({ de: z.string(), en: z.string() }) satisfies z.ZodType<Api['LocalizedText']>;
const Prices = z.object({ student: cents, staff: cents, guest: cents }) satisfies z.ZodType<Api['Prices']>;

export const UserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  role: z.enum(['student', 'staff', 'guest', 'cashier', 'finance']),
  priceGroup: priceGroup.nullish(),
  tillId: z.string().nullish(),
  mensaId: z.string().nullish(),
}) satisfies z.ZodType<Api['User']>;

export const SessionSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal('Bearer').default('Bearer'),
  expiresAt: z.string(),
  user: UserSchema,
}) satisfies z.ZodType<Api['Session']>;

export const AppConfigSchema = z.object({
  minAppVersion: z.string(),
  paymentsEnabled: z.boolean(),
}) satisfies z.ZodType<Api['AppConfig']>;

export const MensaListSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      city: z.string(),
      tills: z.array(z.object({ id: z.string(), name: z.string() })),
      menu: z.array(z.object({ id: z.string(), name: LocalizedText, prices: Prices })),
    }),
  ),
}) satisfies z.ZodType<Api['MensaList']>;

export const OrderSchema = z.object({
  id: z.string(),
  status: z.enum(['open', 'paying', 'paid', 'expired']),
  mensa: RefSchema,
  till: RefSchema,
  items: z.array(
    z.object({
      itemId: z.string(),
      name: LocalizedText,
      quantity: z.number().int().positive(),
      unitPrices: Prices.nullish(),
      unitPriceCents: cents.nullish(),
    }),
  ),
  qrPayload: z.string(),
  currency: z.literal('EUR').default('EUR'),
  amounts: Prices.nullish(),
  priceGroup: priceGroup.nullish(),
  amountCents: cents.nullish(),
  paymentId: z.string().nullish(),
  createdAt: z.string(),
  expiresAt: z.string(),
  version: z.number().int(),
}) satisfies z.ZodType<Api['Order']>;

const refundStatus = z.enum(['pending', 'completed', 'failed']);

export const RefundSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  amountCents: cents,
  currency: z.literal('EUR').default('EUR'),
  status: refundStatus,
  reason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<Api['Refund']>;

const paymentFields = {
  id: z.string(),
  orderId: z.string(),
  status: z.enum(['pending', 'confirmed', 'declined']),
  amountCents: cents,
  currency: z.literal('EUR').default('EUR'),
  priceGroup,
  mensa: RefSchema,
  till: RefSchema,
  payer: z.object({ id: z.string(), displayName: z.string() }),
  items: z.array(z.object({ itemId: z.string(), name: LocalizedText, quantity: z.number().int(), unitPriceCents: cents })),
  refundedAmountCents: cents,
  pendingRefundAmountCents: cents,
  refundableAmountCents: cents,
  needsAttention: z.boolean(),
  attentionReasons: z.array(z.enum(['pending_too_long', 'refund_pending_too_long', 'refund_failed'])),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
};

export const PaymentSchema = z.object(paymentFields) satisfies z.ZodType<Api['Payment']>;

export const PaymentDetailSchema = z.object({
  ...paymentFields,
  refunds: z.array(RefundSchema),
  history: z.array(
    z.object({
      at: z.string(),
      type: z.enum(['payment_created', 'payment_confirmed', 'payment_declined', 'refund_requested', 'refund_completed', 'refund_failed']),
      amountCents: cents.nullable(),
      refundId: z.string().nullable(),
    }),
  ),
}) satisfies z.ZodType<Api['PaymentDetail']>;

export const PaymentPageSchema = z.object({
  items: z.array(PaymentSchema),
  nextCursor: z.string().nullable(),
}) satisfies z.ZodType<Api['PaymentPage']>;

const totals = {
  paymentCount: z.number().int(),
  grossCents: cents,
  refundedCents: cents,
  netCents: cents,
  pendingCount: z.number().int(),
  pendingCents: cents,
};

export const DailyTotalsSchema = z.object({
  ...totals,
  date: z.string(),
  currency: z.literal('EUR').default('EUR'),
  mensas: z.array(z.object({ ...totals, mensa: RefSchema, tills: z.array(z.object({ ...totals, till: RefSchema })) })),
}) satisfies z.ZodType<Api['DailyTotals']>;

export type ApiOrder = z.infer<typeof OrderSchema>;
export type ApiPayment = z.infer<typeof PaymentSchema>;
export type ApiPaymentDetail = z.infer<typeof PaymentDetailSchema>;
export type ApiRefund = z.infer<typeof RefundSchema>;
export type ApiUser = z.infer<typeof UserSchema>;
export type ApiMensaList = z.infer<typeof MensaListSchema>;
export type ApiDailyTotals = z.infer<typeof DailyTotalsSchema>;
