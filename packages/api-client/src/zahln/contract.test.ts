import { describe, expect, it } from 'vitest';

import dailyTotals from '../__fixtures__/daily-totals.json';
import mensas from '../__fixtures__/mensas.json';
import orderCashier from '../__fixtures__/order-cashier.json';
import orderPayer from '../__fixtures__/order-payer.json';
import paymentCreated from '../__fixtures__/payment-created.json';
import paymentDetailCashier from '../__fixtures__/payment-detail-cashier.json';
import attentionPage from '../__fixtures__/payment-page-attention.json';
import paymentPage from '../__fixtures__/payment-page-cashier.json';
import refundCreated from '../__fixtures__/refund-created.json';
import sessionCashier from '../__fixtures__/session-cashier.json';
import sessionFinance from '../__fixtures__/session-finance.json';

import { CashierOrderSchema, DomainDailyTotalsSchema, DomainPaymentDetailSchema, DomainPaymentSchema, DomainRefundSchema, DomainUserSchema, MensasSchema, QuoteSchema } from './mappers';
import { PaymentPageSchema, SessionSchema } from './schemas';

/**
 * Responses recorded from Zahln's test server (dev.zahln.de), so the schemas
 * and mappers are checked against what it really sends, without calling it.
 */
describe("Zahln's responses", () => {
  it('a login names the cashier and their one till', () => {
    const session = SessionSchema.parse({ ...sessionCashier, accessToken: 'token' });
    expect(DomainUserSchema.parse(session.user)).toEqual({
      id: 'usr_cashier_campus_1',
      name: 'Mensa am Campus, Kasse 1',
      role: 'cashier',
      priceGroup: null,
      tillId: 'till_campus_1',
      mensaId: 'mensa_campus',
    });
  });

  it('mensas come with their tills and a menu priced per group', () => {
    const list = MensasSchema.parse(mensas);
    const campus = list.find((m) => m.id === 'mensa_campus');
    expect(campus?.tills.map((t) => t.id)).toEqual(['till_campus_1', 'till_campus_2', 'till_campus_3']);
    expect(campus?.menu[0]).toMatchObject({ id: 'item_campus_veggie', name: { de: 'Tagesgericht vegetarisch' }, prices: { student: { cents: 250 }, guest: { cents: 560 } } });
  });

  it("the cashier's order has every group's total and the QR payload", () => {
    const order = CashierOrderSchema.parse(orderCashier);
    expect(order).toMatchObject({ status: 'open', qrPayload: 'zahln://pay?order=ord_8a5f6c0f4573b58c', amounts: { student: { cents: 890 }, staff: { cents: 1440 } }, version: 1 });
    expect(order.items[1]).toMatchObject({ quantity: 2, unitPrices: { student: { cents: 320 } } });
  });

  it("the payer's view of the same order is their own price", () => {
    const quote = QuoteSchema.parse(orderPayer);
    expect(quote).toMatchObject({ orderId: 'ord_8a5f6c0f4573b58c', priceGroup: 'student', total: { cents: 890 } });
    expect(quote.lines.map((l) => l.total.cents)).toEqual([250, 640]);
  });

  it('refuses one view read as the other, rather than show a wrong amount', () => {
    expect(QuoteSchema.safeParse(orderCashier).success).toBe(false);
    expect(CashierOrderSchema.safeParse(orderPayer).success).toBe(false);
  });

  it('a new payment starts pending', () => {
    expect(DomainPaymentSchema.parse(paymentCreated)).toMatchObject({ status: 'pending', amount: { cents: 250 }, priceGroup: 'student', till: { id: 'till_campus_1' } });
  });

  it('a payment detail carries its refunds and history, and what is left to refund', () => {
    const detail = DomainPaymentDetailSchema.parse(paymentDetailCashier);
    expect(detail).toMatchObject({ status: 'confirmed', refunded: { cents: 100 }, refundable: { cents: 150 } });
    expect(detail.refunds).toEqual([expect.objectContaining({ status: 'completed', amount: { cents: 100, currency: 'EUR' }, reason: 'wrong_dish' })]);
    expect(detail.history.map((e) => e.type)).toContain('refund_completed');
  });

  it('a refund starts pending', () => {
    expect(DomainRefundSchema.parse(refundCreated)).toMatchObject({ status: 'pending', amount: { cents: 100 } });
  });

  it('payments come in pages with a cursor', () => {
    const page = PaymentPageSchema.parse(paymentPage);
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toEqual(expect.any(String));
  });

  it('finance logs in without a till or price group', () => {
    const session = SessionSchema.parse(sessionFinance);
    expect(DomainUserSchema.parse(session.user)).toMatchObject({ id: 'usr_finance', role: 'finance', tillId: null, priceGroup: null });
  });

  it("a day's totals add up per mensa and per till, with pending kept apart", () => {
    const totals = DomainDailyTotalsSchema.parse(dailyTotals);
    expect(totals).toMatchObject({ date: '2026-10-31', gross: { cents: 250 }, refunded: { cents: 100 }, net: { cents: 150 }, pendingCount: 0 });
    expect(totals.mensas.map((m) => m.mensa.id)).toEqual(['cafe_bibliothek', 'mensa_campus', 'mensa_nord']);
    for (const mensa of totals.mensas) {
      expect(mensa.tills.reduce((sum, till) => sum + till.gross.cents, 0)).toBe(mensa.gross.cents);
    }
    expect(totals.mensas.reduce((sum, m) => sum + m.net.cents, 0)).toBe(totals.net.cents);
  });

  it('payments needing attention say why', () => {
    const page = PaymentPageSchema.parse(attentionPage);
    expect(page.nextCursor).toEqual(expect.any(String));
    expect(page.items[0]).toMatchObject({ status: 'pending', needsAttention: true, attentionReasons: ['pending_too_long'] });
  });
});
