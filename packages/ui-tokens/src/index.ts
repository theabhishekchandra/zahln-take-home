/**
 * Design tokens shared by the native apps and the web dashboard.
 *
 * Source: the Zahln design handoff, "H1 Foundations" and "H2 Components". A value
 * a screen needs that is not here is a bug in the screen, not a new token.
 * Text colours meet WCAG AA (4.5:1) and borders/icons 3:1 on their surface in both schemes.
 */
export type ColorScheme = 'light' | 'dark';

export interface Colors {
  /** Page and screen background. */
  readonly surface: string;
  /** Cards, sheets, bars, table rows. */
  readonly surfaceRaised: string;
  /** Primary text and amounts. */
  readonly ink: string;
  /** Body copy in messages. */
  readonly inkSecondary: string;
  /** Timestamps and hints. */
  readonly inkMuted: string;
  /** Primary action fill, links, the Zahln mark. */
  readonly brand: string;
  readonly brandPressed: string;
  /** Text and icons on a brand fill. */
  readonly onBrand: string;
  /** Selected rows, icon tiles, subtle highlights. Text on it is ink or brand. */
  readonly brandTint: string;
  /** Confirmed payments. Blue, so it never relies on telling green from red. */
  readonly success: string;
  readonly successTint: string;
  /** Outcome unknown ("Being checked"). Never shown as success. */
  readonly pending: string;
  readonly pendingTint: string;
  /** Declined, failed, not allowed. */
  readonly danger: string;
  readonly dangerTint: string;
  /** Staff price group. */
  readonly staff: string;
  readonly staffTint: string;
  /** Borders of inputs, buttons and table cells (3:1). Not for text. */
  readonly line: string;
  /** Border of a disabled control. */
  readonly lineDisabled: string;
  /** Row separators only; decorative. */
  readonly divider: string;
  /** Pressed fill of secondary and icon buttons. */
  readonly pressed: string;
  /** Fill and label of a disabled primary button. */
  readonly disabledFill: string;
  readonly disabledInk: string;
  /** Focus ring, 2 dp. */
  readonly focus: string;
  /** Dialog and sheet scrim. */
  readonly scrim: string;
}

export const colors: Readonly<Record<ColorScheme, Colors>> = {
  light: {
    surface: '#f3f5f2',
    surfaceRaised: '#ffffff',
    ink: '#14211c',
    inkSecondary: '#3a4842',
    inkMuted: '#5b6862',
    brand: '#0b5d4b',
    brandPressed: '#084536',
    onBrand: '#ffffff',
    brandTint: '#e3f2ec',
    success: '#00698f',
    successTint: '#e0eff6',
    pending: '#8a5a00',
    pendingTint: '#fff3df',
    danger: '#b3261e',
    dangerTint: '#fbe7e5',
    staff: '#3e3a7a',
    staffTint: '#eceaf6',
    line: '#7a847e',
    lineDisabled: '#c9d1cc',
    divider: '#eef1ee',
    pressed: '#eef1ee',
    disabledFill: '#e3e8e5',
    disabledInk: '#4a5752',
    focus: '#1a4fd6',
    scrim: 'rgba(16, 24, 20, 0.45)',
  },
  dark: {
    surface: '#0e1512',
    surfaceRaised: '#18221e',
    ink: '#e7eeea',
    inkSecondary: '#c3cfc9',
    inkMuted: '#9fb0a8',
    brand: '#4cc59f',
    brandPressed: '#3aa785',
    onBrand: '#06231b',
    brandTint: '#173a30',
    success: '#7cc8ea',
    successTint: '#102f3c',
    pending: '#f1bf6a',
    pendingTint: '#2a2113',
    danger: '#ff8a80',
    dangerTint: '#3a1b18',
    staff: '#b9b4f0',
    staffTint: '#25233f',
    line: '#5f6b65',
    lineDisabled: '#34403a',
    divider: '#24302b',
    pressed: '#24302b',
    disabledFill: '#24302b',
    disabledInk: '#9fb0a8',
    focus: '#8fb4ff',
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
};

/** A QR code always sits on white with black modules, in both schemes, so scanners read it. */
export const qr = { ground: '#ffffff', ink: '#000000' } as const;

/** The welcome hero is deep brand in both schemes. Ink on it is 10.8:1, muted ink 8.2:1. `live`: the "connected" dot. */
export const hero = { ground: '#08463a', ink: '#ffffff', inkMuted: '#cfe5dc', live: '#5fd0b0' } as const;

/** 4 dp grid. 5 (20) is the phone screen gutter. */
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;

export const radius = {
  /** Inputs, chips and table cells on the dashboard. */
  sm: 8,
  /** Icon tiles. */
  tile: 12,
  /** Buttons, inputs, notice cards. */
  control: 16,
  /** Cards. */
  card: 20,
  /** Sheet and bottom bar top corners. */
  sheet: 28,
  pill: 999,
} as const;

export const fontFamily = {
  sans: 'Manrope',
  mono: 'ui-monospace, "Roboto Mono", Menlo, Consolas, monospace',
} as const;

export type FontWeight = 400 | 600 | 700;

export interface TextStyleToken {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight: FontWeight;
  readonly letterSpacing?: number;
  readonly tabular?: boolean;
}

/**
 * Type scale. Body is 16/24 rather than the sheet's 15/22: the brief tests on a
 * low-end phone, and 16 is the floor the design's own tokens.json sets for the phone.
 */
export const typography = {
  amount: { fontSize: 48, lineHeight: 56, fontWeight: 700, letterSpacing: -2, tabular: true },
  /** The amount steps down to this when it would wrap (small phone, large text). */
  amountCompact: { fontSize: 40, lineHeight: 44, fontWeight: 700, letterSpacing: -1.5, tabular: true },
  titleL: { fontSize: 28, lineHeight: 34, fontWeight: 700, letterSpacing: -0.6 },
  titleM: { fontSize: 24, lineHeight: 30, fontWeight: 700, letterSpacing: -0.4 },
  titleS: { fontSize: 20, lineHeight: 26, fontWeight: 700 },
  button: { fontSize: 16, lineHeight: 20, fontWeight: 700 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: 400 },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: 700 },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: 400 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: 600 },
} as const satisfies Record<string, TextStyleToken>;

export type TypographyVariant = keyof typeof typography;

export const size = {
  /** Smallest touch target on the phone and dashboard (Android 48 dp, WCAG 2.5.5). */
  tapMin: 48,
  /** Smallest touch target on the till tablet, used with gloves and at speed. */
  tapTill: 64,
  /** Height of the primary button. */
  primaryButton: 56,
  /** Transaction row. */
  row: 64,
  iconTile: 40,
} as const;

/** CSS box-shadow values; React Native accepts the same strings via `boxShadow`. */
export const elevation = {
  card: '0 1px 3px rgba(16, 24, 20, 0.08)',
  bar: '0 -6px 20px rgba(16, 24, 20, 0.07)',
  sheet: '0 16px 40px rgba(16, 24, 20, 0.18)',
} as const;

/** Milliseconds. With "remove animations" on, every transition is a 100 ms fade and loops stop. */
export const motion = { press: 150, sheet: 250, result: 450, reduced: 100 } as const;
