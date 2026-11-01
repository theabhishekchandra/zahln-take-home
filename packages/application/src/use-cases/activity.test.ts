import {
  asMensaId,
  asOrderId,
  asPaymentId,
  asTillId,
  asUserId,
  money,
  type Payment,
  type PaymentStatus,
} from '@zahln/domain';
import { describe, expect, it } from 'vitest';

import type { PaymentsPort } from '../ports';
import { err, ok } from '../result';
import { loadMonthSummary, spentByWeek } from './activity';

const lena = asUserId('user-student');
let n = 0;
function payment(createdAt: Date, cents: number, status: PaymentStatus = 'confirmed', refunded = 0): Payment {
  const id = `p${++n}`;
  return {
    id: asPaymentId(id),
    orderId: asOrderId(id),
    status,
    amount: money(cents),
    priceGroup: 'student',
    mensa: { id: asMensaId('mensa_campus'), name: 'Mensa am Campus' },
    till: { id: asTillId('till_campus_1'), name: 'Kasse 1' },
    payer: { id: lena, name: 'Test Student' },
    items: [],
    refunded: money(refunded),
    refundPending: money(0),
    refundable: money(status === 'confirmed' ? cents - refunded : 0),
    needsAttention: false,
    attentionReasons: [],
    version: 1,
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
  };
}

/** Pages of two, newest first, like the real list endpoint. */
function port(payments: readonly Payment[]): PaymentsPort & { calls: number } {
  const sorted = [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const self = {
    calls: 0,
    submit: async () => err({ kind: 'not_processed', cause: 'rejected', retryable: false }) as never,
    get: async () => err({ kind: 'not_processed', cause: 'rejected', retryable: false }) as never,
    list: async (query: Parameters<PaymentsPort['list']>[0]) => {
      self.calls++;
      const matches = sorted.filter((p) => !query.from || p.createdAt >= query.from);
      const offset = Number(query.cursor ?? 0);
      const limit = Math.min(query.limit ?? 20, 2);
      return ok({
        items: matches.slice(offset, offset + limit),
        nextCursor: offset + limit < matches.length ? String(offset + limit) : null,
      });
    },
  };
  return self;
}

describe('loadMonthSummary', () => {
  const now = new Date(2026, 9, 30, 12, 0);
  const clock = { now: () => now };

  it('adds up this month across pages, less refunds, and never counts unsettled payments as spent', async () => {
    const payments = port([
      payment(new Date(2026, 9, 2, 12), 320),
      payment(new Date(2026, 9, 10, 12), 540, 'confirmed', 540),
      payment(new Date(2026, 9, 20, 12), 290),
      payment(new Date(2026, 9, 29, 12), 410, 'pending'),
      payment(new Date(2026, 9, 30, 11), 350, 'declined'),
      payment(new Date(2026, 8, 30, 12), 999),
    ]);
    const summary = await loadMonthSummary({ payments, clock });
    expect(summary.ok).toBe(true);
    if (!summary.ok) return;
    expect(summary.value.spent.cents).toBe(320 + 0 + 290);
    expect(summary.value.confirmedCount).toBe(3);
    expect(summary.value.checking.map((p) => p.amount.cents)).toEqual([410]);
    expect(summary.value.recent).toHaveLength(2);
    expect(summary.value.payments).toHaveLength(5);
    // 2 Oct, (10 Oct refunded in full), 20 Oct; 30 Oct is in the fifth week.
    expect(summary.value.weekly.map((m) => m.cents)).toEqual([320, 0, 290, 0, 0]);
    expect(payments.calls).toBeGreaterThan(2);
  });

  it('passes a server error through', async () => {
    const payments = port([]);
    payments.list = async () => err({ kind: 'not_processed', cause: 'offline', retryable: true });
    expect(await loadMonthSummary({ payments, clock })).toMatchObject({ ok: false });
  });
});

describe('spentByWeek', () => {
  it('has a block per week up to the current one, and leaves out other months', () => {
    const now = new Date(2026, 9, 15, 9);
    const weeks = spentByWeek(
      [
        payment(new Date(2026, 9, 1, 12), 100),
        payment(new Date(2026, 9, 7, 12), 200),
        payment(new Date(2026, 9, 8, 12), 300, 'confirmed', 100),
        payment(new Date(2026, 8, 30, 12), 999),
      ],
      now,
    );
    expect(weeks.map((m) => m.cents)).toEqual([300, 200, 0]);
  });
});
