import { businessTime } from '@zahln/domain';

export type DayPart = 'morning' | 'afternoon' | 'evening';

/** The part of the day in Berlin, for W2's greeting: morning from 5, afternoon from 12, evening from 18. */
export function dayPart(instant: Date): DayPart {
  const hour = Number(businessTime(instant).slice(0, 2));
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

const words = (name: string) => name.trim().split(/\s+/).filter(Boolean);

/** "Sabine Becker" → "Sabine". Empty when the server sent no name. */
export function firstName(name: string): string {
  return words(name)[0] ?? '';
}

/** "Sabine Becker" → "SB", "finance" → "F": first and last word, for the sidebar's avatar. */
export function initials(name: string): string {
  const all = words(name);
  const picked = all.length > 1 ? [all[0]!, all[all.length - 1]!] : all;
  return picked.map((word) => word[0]!.toLocaleUpperCase()).join('');
}
