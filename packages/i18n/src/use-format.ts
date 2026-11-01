import type { LocalizedText, Money } from '@zahln/domain';
import { useMemo } from 'react';

import {
  daysAgo,
  formatBusinessDateTime,
  formatBusinessDay,
  formatBusinessDayShort,
  formatBusinessTime,
  formatChange,
  formatCount,
  formatDateTime,
  formatMoney,
  formatMoneyInput,
  formatMoneySpoken,
  formatMonth,
  formatTime,
} from './format';
import { useLanguage } from './use-language';

/** The formatters, bound to the language on screen. */
export function useFormat() {
  const [language] = useLanguage();
  return useMemo(
    () => ({
      language,
      /** Server text in the language on screen, such as a dish name. */
      text: (text: LocalizedText) => text[language],
      money: (amount: Money) => formatMoney(amount, language),
      /** "−€5.30", with a real minus sign, for money that left the account. */
      debit: (amount: Money) => `−${formatMoney(amount, language)}`,
      moneySpoken: (amount: Money) => formatMoneySpoken(amount, language),
      moneyInput: (amount: Money) => formatMoneyInput(amount, language),
      time: (date: Date | string) => formatTime(date, language),
      dateTime: (iso: string) => formatDateTime(iso, language),
      month: (date: Date) => formatMonth(date, language),
      daysAgo,
      count: (count: number) => formatCount(count, language),
      change: (ratio: number) => formatChange(ratio, language),
      /** Zahln's business day in Berlin (YYYY-MM-DD). */
      day: (day: string, withYear = false) => formatBusinessDay(day, language, withYear),
      dayShort: (day: string) => formatBusinessDayShort(day, language),
      /** An instant on Berlin's clock, as finance reads it. */
      berlinTime: (iso: string, withSeconds = false) => formatBusinessTime(iso, language, withSeconds),
      berlinDateTime: (iso: string) => formatBusinessDateTime(iso, language),
    }),
    [language],
  );
}

export type Format = ReturnType<typeof useFormat>;
