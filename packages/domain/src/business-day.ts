/**
 * Zahln counts money per day in Europe/Berlin, whatever the device's time
 * zone. These helpers turn instants into those days and back.
 */
const ZONE = 'Europe/Berlin';

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function berlinParts(instant: Date) {
  const parts = Object.fromEntries(formatter.formatToParts(instant).map((part) => [part.type, part.value]));
  return { year: +parts.year!, month: +parts.month!, day: +parts.day!, hour: +parts.hour!, minute: +parts.minute!, second: +parts.second! };
}

/** How far Berlin's wall clock is ahead of UTC at `instant`, in ms. */
function berlinOffsetMs(instant: Date): number {
  const p = berlinParts(instant);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(instant.getTime() / 1000) * 1000;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The Berlin day an instant falls on, as YYYY-MM-DD. */
export function businessDay(instant: Date): string {
  const p = berlinParts(instant);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Berlin wall-clock time of an instant, as HH:MM. */
export function businessTime(instant: Date): string {
  const p = berlinParts(instant);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** The instant a Berlin day starts. */
function startOf(day: string): Date {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  const wall = Date.UTC(year, month - 1, date);
  // Twice, because the offset at the guess can differ from the offset at midnight around a DST change.
  const first = wall - berlinOffsetMs(new Date(wall));
  return new Date(wall - berlinOffsetMs(new Date(first)));
}

/** A Berlin day as instants: from its first moment (inclusive) to the next day's (exclusive). */
export function businessDayRange(day: string): { readonly from: string; readonly to: string } {
  return { from: startOf(day).toISOString(), to: startOf(addDays(day, 1)).toISOString() };
}

/** Several Berlin days: from the start of `first` to the end of `last`. */
export function businessDaysRange(first: string, last: string): { readonly from: string; readonly to: string } {
  return { from: businessDayRange(first).from, to: businessDayRange(last).to };
}

/** The day `days` after (or before, if negative) a YYYY-MM-DD day. */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(year, month - 1, date + days));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD day. */
export function weekday(day: string): number {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, date)).getUTCDay();
}
