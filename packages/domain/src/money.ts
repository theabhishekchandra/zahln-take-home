export type Currency = 'EUR';

/**
 * An amount of money in minor units (cents). Never a float: 0.1 + 0.2 must not
 * decide what a student pays.
 */
export interface Money {
  readonly cents: number;
  readonly currency: Currency;
}

export function money(cents: number, currency: Currency = 'EUR'): Money {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Money must be a whole number of cents, got ${cents}`);
  }
  return { cents, currency };
}

export const zero = (currency: Currency = 'EUR'): Money => money(0, currency);

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Cannot combine ${a.currency} with ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.cents + b.cents, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.cents - b.cents, a.currency);
}

export function multiplyMoney(a: Money, quantity: number): Money {
  if (!Number.isSafeInteger(quantity)) {
    throw new RangeError(`Quantity must be a whole number, got ${quantity}`);
  }
  return money(a.cents * quantity, a.currency);
}

export function sumMoney(amounts: readonly Money[], currency: Currency = 'EUR'): Money {
  return amounts.reduce(addMoney, zero(currency));
}

/** Negative if a < b, 0 if equal, positive if a > b. */
export function compareMoney(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.cents - b.cents;
}

export const isPositive = (a: Money) => a.cents > 0;

/**
 * Reads an amount typed on the till: "2", "2.5", "2,50", "€ 2.00". Returns null
 * for anything else, including more than two decimals or a negative sign.
 */
export function parseMoneyInput(text: string, currency: Currency = 'EUR'): Money | null {
  const match = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(text.replace(/[€\s]/g, ''));
  if (!match) return null;
  const [, whole = '0', fraction = ''] = match;
  return money(Number(whole) * 100 + Number(fraction.padEnd(2, '0')), currency);
}
