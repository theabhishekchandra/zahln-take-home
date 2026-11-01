import { describe, expect, it } from 'vitest';

import { addMoney, compareMoney, money, multiplyMoney, subtractMoney, sumMoney } from './money';

describe('money', () => {
  it('only accepts whole cents', () => {
    expect(() => money(3.2)).toThrow(RangeError);
    expect(money(320)).toEqual({ cents: 320, currency: 'EUR' });
  });

  it('adds, subtracts, multiplies and sums in cents', () => {
    expect(addMoney(money(10), money(20)).cents).toBe(30);
    expect(subtractMoney(money(10), money(30)).cents).toBe(-20);
    expect(multiplyMoney(money(320), 3).cents).toBe(960);
    expect(sumMoney([money(1), money(2), money(3)]).cents).toBe(6);
    expect(compareMoney(money(1), money(2))).toBeLessThan(0);
  });

  it('rejects fractional quantities', () => {
    expect(() => multiplyMoney(money(320), 1.5)).toThrow(RangeError);
  });
});
