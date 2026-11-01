import { describe, expect, it } from 'vitest';

import { payment } from './__fixtures__';
import { money } from './money';
import { netPaid, newerPayment, paymentStanding, refundableAmount } from './payment';

describe('newerPayment', () => {
  it('keeps the higher version regardless of arrival order', () => {
    const v1 = payment('pending', 1);
    const v2 = payment('confirmed', 2);
    expect(newerPayment(v1, v2)).toBe(v2);
    expect(newerPayment(v2, v1)).toBe(v2);
    expect(newerPayment(undefined, v1)).toBe(v1);
  });

  it('keeps the current object for a duplicate of the same version', () => {
    const current = payment('pending', 3);
    expect(newerPayment(current, payment('pending', 3))).toBe(current);
  });
});

describe('refundableAmount', () => {
  it("is the server's count for a confirmed payment, pending refunds included", () => {
    expect(refundableAmount(payment('confirmed', 2, { refunded: money(100), refundPending: money(20), refundable: money(200) })).cents).toBe(200);
  });

  it('is zero for payments that did not complete, whatever the server sends', () => {
    expect(refundableAmount(payment('pending', 1, { refundable: money(320) })).cents).toBe(0);
    expect(refundableAmount(payment('declined', 2, { refundable: money(320) })).cents).toBe(0);
  });
});

describe('netPaid', () => {
  it('is a confirmed amount less completed refunds, and nothing otherwise', () => {
    expect(netPaid(payment('confirmed', 2, { refunded: money(120) })).cents).toBe(200);
    expect(netPaid(payment('pending', 1)).cents).toBe(0);
  });
});

describe('paymentStanding', () => {
  it('reads the server status and refunds', () => {
    const paid = payment('confirmed', 1, { amount: money(460) });
    expect(paymentStanding(paid)).toBe('paid');
    expect(paymentStanding({ ...paid, refunded: money(100) })).toBe('partly_refunded');
    expect(paymentStanding({ ...paid, refunded: money(460) })).toBe('refunded');
    expect(paymentStanding(payment('pending', 1))).toBe('checking');
    expect(paymentStanding(payment('declined', 1))).toBe('declined');
  });
});
