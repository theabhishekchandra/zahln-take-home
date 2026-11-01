import { asIdempotencyKey, asMensaId, asMenuItemId, asOrderId, asPaymentId, asTillId, asUserId } from '../ids';
import { money } from '../money';
import type { Order, Quote } from '../order';
import type { Payment, PaymentStatus } from '../payment';
import type { PaymentIntent } from '../payment-intent';

const mensa = { id: asMensaId('mensa_campus'), name: 'Mensa am Campus' };
const till = { id: asTillId('till_campus_1'), name: 'Kasse 1' };
const pasta = { de: 'Pasta Bolognese', en: 'Pasta bolognese' };

export const quote: Quote = {
  orderId: asOrderId('ord_1'),
  status: 'open',
  mensa,
  till,
  priceGroup: 'student',
  lines: [{ itemId: asMenuItemId('item_pasta'), name: pasta, quantity: 1, unitPrice: money(320), total: money(320) }],
  total: money(320),
  paymentId: null,
  expiresAt: '2026-10-30T12:05:00.000Z',
  version: 1,
};

export const order: Order = {
  id: quote.orderId,
  status: 'open',
  mensa,
  till,
  items: [{ itemId: asMenuItemId('item_pasta'), name: pasta, quantity: 1, unitPrices: { student: money(320), staff: money(510), guest: money(650) } }],
  amounts: { student: money(320), staff: money(510), guest: money(650) },
  qrPayload: 'zahln://pay?order=ord_1',
  paymentId: null,
  createdAt: '2026-10-30T12:00:00.000Z',
  expiresAt: '2026-10-30T12:05:00.000Z',
  version: 1,
};

export const intent: PaymentIntent = {
  idempotencyKey: asIdempotencyKey('key-1'),
  userId: asUserId('usr_student'),
  quote,
  createdAt: '2026-10-30T12:00:00.000Z',
};

export function payment(status: PaymentStatus, version: number, overrides: Partial<Payment> = {}): Payment {
  return {
    id: asPaymentId('pay_1'),
    orderId: quote.orderId,
    status,
    amount: money(320),
    priceGroup: 'student',
    mensa,
    till,
    payer: { id: intent.userId, name: 'Test Student' },
    items: [{ itemId: 'item_pasta', name: pasta, quantity: 1, unitPrice: money(320) }],
    refunded: money(0),
    refundPending: money(0),
    refundable: status === 'confirmed' ? money(320) : money(0),
    needsAttention: false,
    attentionReasons: [],
    version,
    createdAt: '2026-10-30T12:00:01.000Z',
    updatedAt: '2026-10-30T12:00:01.000Z',
    ...overrides,
  };
}
