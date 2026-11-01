import { money } from '@zahln/domain';
import { describe, expect, it } from 'vitest';

import { daysAgo, formatCountdown, formatMoney, formatMoneySpoken } from './format';
import { createI18n, resolveLanguage } from './i18n';
import { de } from './resources/de';
import { en } from './resources/en';

const keys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

describe('i18n', () => {
  it('has the same keys in German and English', () => {
    expect(keys(de).sort()).toEqual(keys(en).sort());
  });

  it('resolves the device language, defaulting to German', () => {
    expect(resolveLanguage(['en-US', 'de-DE'])).toBe('en');
    expect(resolveLanguage(['fr-FR'])).toBe('de');
  });

  it('formats euros for each locale', () => {
    expect(formatMoney(money(320), 'de').replace(/\s/g, ' ')).toBe('3,20 €');
    expect(formatMoney(money(320), 'en')).toBe('€3.20');
  });

  it('translates synchronously with interpolation', () => {
    const i18n = createI18n('de');
    expect(i18n.t('review.pay', { amount: '3,20 €' })).toBe('3,20 € bezahlen');
  });

  it('uses plural forms', () => {
    const i18n = createI18n('en');
    expect(i18n.t('pin.wrong', { count: 1 })).toBe('Wrong PIN · 1 attempt left');
    expect(i18n.t('pin.wrong', { count: 2 })).toBe('Wrong PIN · 2 attempts left');
  });

  it('speaks amounts as euros and cents', () => {
    expect(formatMoneySpoken(money(530), 'en')).toBe('5 euros 30');
    expect(formatMoneySpoken(money(100), 'en')).toBe('1 euro');
    expect(formatMoneySpoken(money(805), 'de')).toBe('8 Euro 5');
  });

  it('formats countdowns and calendar days', () => {
    expect(formatCountdown(102)).toBe('1:42');
    expect(formatCountdown(-3)).toBe('0:00');
    const now = new Date(2026, 9, 30, 0, 30);
    expect(daysAgo(new Date(2026, 9, 29, 23, 59), now)).toBe(1);
    expect(daysAgo(new Date(2026, 9, 30, 0, 1), now)).toBe(0);
  });
});
