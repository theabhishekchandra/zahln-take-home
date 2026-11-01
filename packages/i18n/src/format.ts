import type { Money } from '@zahln/domain';

import { localeFor, type Language } from './i18n';

/** "€5.30" / "5,30 €" */
export function formatMoney(amount: Money, language: Language): string {
  return new Intl.NumberFormat(localeFor(language), { style: 'currency', currency: amount.currency }).format(
    amount.cents / 100,
  );
}

/** An amount as typed into a field: "3.60" in English, "3,60" in German, no currency sign. */
export function formatMoneyInput(amount: Money, language: Language): string {
  const text = (amount.cents / 100).toFixed(2);
  return language === 'de' ? text.replace('.', ',') : text;
}

/**
 * How a screen reader should say an amount: "5 euros 30", never "five point
 * three zero" (design handoff, screen 27).
 */
export function formatMoneySpoken(amount: Money, language: Language): string {
  const sign = amount.cents < 0 ? 'minus ' : '';
  const euros = Math.floor(Math.abs(amount.cents) / 100);
  const cents = Math.abs(amount.cents) % 100;
  const unit = language === 'de' ? 'Euro' : euros === 1 ? 'euro' : 'euros';
  return cents === 0 ? `${sign}${euros} ${unit}` : `${sign}${euros} ${unit} ${cents}`;
}

export function formatDateTime(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(localeFor(language), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

/** "11:48" */
export function formatTime(date: Date | string, language: Language): string {
  return new Intl.DateTimeFormat(localeFor(language), { hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

/** "October" / "Oktober" */
export function formatMonth(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(localeFor(language), { month: 'long' }).format(date);
}

/** A countdown such as "1:42". */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Whole calendar days between two instants in the device's time zone: 0 today, 1 yesterday. */
export function daysAgo(date: Date | string, now: Date): number {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(now) - start(new Date(date))) / 86_400_000);
}

const BERLIN = 'Europe/Berlin';

/** A Berlin business day (YYYY-MM-DD): "Saturday, 31 October" / "Samstag, 31. Oktober". */
export function formatBusinessDay(day: string, language: Language, withYear = false): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`));
}

/** A short Berlin day for chart labels: "31 Oct" / "31. Okt.". */
export function formatBusinessDayShort(day: string, language: Language): string {
  return new Intl.DateTimeFormat(localeFor(language), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
}

/** An instant as Berlin wall-clock time: "12:51". Finance reads the mensa's time, not the browser's. */
export function formatBusinessTime(iso: string, language: Language, withSeconds = false): string {
  return new Intl.DateTimeFormat(localeFor(language), {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
    timeZone: BERLIN,
  }).format(new Date(iso));
}

/** An instant as a Berlin date and time: "Sat, 31 Oct 2026, 12:51". */
export function formatBusinessDateTime(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(localeFor(language), { dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23', timeZone: BERLIN }).format(new Date(iso));
}

/** "1,290" / "1.290" */
export function formatCount(count: number, language: Language): string {
  return new Intl.NumberFormat(localeFor(language)).format(count);
}

/** A change as a percentage with one decimal, sign included: "+11.3 %" / "−15,3 %". */
export function formatChange(ratio: number, language: Language): string {
  const text = new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(Math.abs(ratio) * 100);
  return `${ratio < 0 ? '−' : '+'}${text} %`;
}
