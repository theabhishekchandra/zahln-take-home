import Svg, { Path } from 'react-native-svg';

/** Icon paths from the design handoff, drawn on a 24 × 24 grid. */
const paths = {
  check: 'M12 3a9 9 0 100 18 9 9 0 000-18zM8 12.5l2.7 2.7L16 10',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  cross: 'M12 3a9 9 0 100 18 9 9 0 000-18zM9 9l6 6M15 9l-6 6',
  alert: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7.5v5.5M12 16.5v.5',
  refund: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z',
  chevronRight: 'M9 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  scan: 'M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M4 12h16',
  home: 'M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z',
  activity: 'M4 6h16M4 12h16M4 18h10',
  profile: 'M12 4a4 4 0 100 8 4 4 0 000-8zM4 21c1-4 4.5-6 8-6s7 2 8 6',
  bell: 'M6 16V11a6 6 0 0112 0v5l1.5 2h-15zM10 20a2 2 0 004 0',
  lock: 'M7 11h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2zM8 11V8a4 4 0 018 0v3',
  mensa: 'M3 11h18a9 9 0 01-18 0zM8 7c0-1.5 1.5-1.5 1.5-3M12 7c0-1.5 1.5-1.5 1.5-3M16 7c0-1.5 1.5-1.5 1.5-3',
  search: 'M11 4.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM16 16l4 4',
  chevronLeft: 'M15 6l-6 6 6 6',
  tick: 'M5 12.5l4.5 4.5L19 7',
  fingerprint: 'M6 10a6 6 0 0112 0v2M9 20c-1-2-1.5-4-1.5-6.5a4.5 4.5 0 019 0c0 3 .5 5 1.5 6.5M12 12v3c0 2 .5 3.5 1 4.5',
  backspace: 'M9 5h11v14H9l-6-7zM12.5 9.5l5 5M17.5 9.5l-5 5',
  torch: 'M13 2L4 14h7l-1 8 9-12h-7z',
  keyboard: 'M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zM7 10h.01M11 10h.01M15 10h.01M8 14h8',
  offline: 'M2 8.5a15 15 0 0120 0M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0M12 19h.01M3 3l18 18',
  camera: 'M4 8h3l2-3h6l2 3h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1zM12 10a3.5 3.5 0 100 7 3.5 3.5 0 000-7z',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  tune: 'M4 7h10M18 7h2M16 5v4M4 17h4M12 17h8M10 15v4',
  back: 'M15 5l-7 7 7 7',
  share: 'M12 3v12M7.5 7.5L12 3l4.5 4.5M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  swap: 'M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12',
  signOut: 'M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M10 8l-4 4 4 4M6 12h10',
  pause: 'M9 6v12M15 6v12',
} as const;

export type IconName = keyof typeof paths;

export interface IconProps {
  readonly name: IconName;
  readonly color: string;
  readonly size?: number;
  readonly strokeWidth?: number;
  /** Filled glyph, e.g. the selected tab. */
  readonly filled?: boolean;
}

/** Decorative: hidden from screen readers. The control or text next to it carries the meaning. */
export function Icon({ name, color, size = 24, strokeWidth = 2, filled = false }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none">
      <Path
        d={paths[name]}
        fill={filled ? color : 'none'}
        stroke={filled ? 'none' : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
