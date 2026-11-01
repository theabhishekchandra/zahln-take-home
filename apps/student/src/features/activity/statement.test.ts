import { asMensaId, asOrderId, asPaymentId, asTillId, asUserId, money, type Payment } from '@zahln/domain';
import { formatMoney, type Format, type Language } from '@zahln/i18n';
import { describe, expect, it } from 'vitest';

import { matchesSearch } from './statement';

const soup: Payment = {
  id: asPaymentId('pay_96dab88ce54d6198'),
  orderId: asOrderId('ord_662fa63711474e92'),
  status: 'confirmed',
  amount: money(320),
  priceGroup: 'student',
  mensa: { id: asMensaId('mensa_nord'), name: 'Mensa Nord' },
  till: { id: asTillId('till_nord_2'), name: 'Kasse 2' },
  payer: { id: asUserId('usr_student'), name: 'Test Student' },
  items: [],
  refunded: money(0),
  refundPending: money(0),
  refundable: money(320),
  needsAttention: false,
  attentionReasons: [],
  version: 1,
  createdAt: '2026-10-29T11:57:04.391Z',
  updatedAt: '2026-10-29T11:57:04.391Z',
};

// Only `money` is used to search.
const formatIn = (language: Language) => ({ money: (amount: Parameters<typeof formatMoney>[0]) => formatMoney(amount, language) }) as Format;

describe('matchesSearch', () => {
  it.each(['', '  ', 'nord', 'Kasse 2', 'pay_96dab', 'ord_662f'])('finds the payment by "%s"', (query) => {
    expect(matchesSearch(soup, query, formatIn('en'))).toBe(true);
  });

  it.each([
    ['en', '3.20'],
    ['en', '3,20'],
    ['en', '€3.20'],
    ['de', '3.20'],
    ['de', '3,20 €'],
  ] as const)('finds €3.20 in %s by "%s", whichever separator is typed', (language, query) => {
    expect(matchesSearch(soup, query, formatIn(language))).toBe(true);
  });

  it.each(['campus', '4.10', 'pay_000'])('leaves it out for "%s"', (query) => {
    expect(matchesSearch(soup, query, formatIn('en'))).toBe(false);
  });
});
