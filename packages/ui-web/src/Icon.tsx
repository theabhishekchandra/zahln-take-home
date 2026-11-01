/** Line icons from the design handoff, drawn on a 24 × 24 grid in the current text colour. */
const paths = {
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  search: 'M16 16l4 4M17.5 11a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z',
  copy: 'M10 8h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM4 16V5a1 1 0 0 1 1-1h11',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6L6 18',
  retry: 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4',
  mensa: 'M3 11h18a9 9 0 0 1-18 0zM8 7c0-1.5 1.5-1.5 1.5-3M12 7c0-1.5 1.5-1.5 1.5-3M16 7c0-1.5 1.5-1.5 1.5-3',
  chevron: 'M9 6l6 6-6 6',
  overview: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  attention: 'M12 3l9.5 17h-19zM12 10v4M12 17h.01',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
} as const;

export type IconName = keyof typeof paths;

/** Decorative: always hidden from screen readers, so the control around it carries the words. */
export function Icon({ name, size = 18, strokeWidth = 2 }: { readonly name: IconName; readonly size?: number; readonly strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      style={{ flex: 'none' }}>
      <path d={paths[name]} />
    </svg>
  );
}
