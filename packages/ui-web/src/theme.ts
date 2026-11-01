import { colors, elevation, fontFamily, radius, size, spacing, type ColorScheme } from '@zahln/ui-tokens';

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** The shared tokens as CSS custom properties, e.g. `--color-ink-muted`, `--space-4`, `--radius-card`. */
export function cssVariables(scheme: ColorScheme): string {
  const entries = [
    ...Object.entries(colors[scheme]).map(([k, v]) => [`--color-${kebab(k)}`, v]),
    ...Object.entries(spacing).map(([k, v]) => [`--space-${k}`, `${v}px`]),
    ...Object.entries(radius).map(([k, v]) => [`--radius-${k}`, `${v}px`]),
    ...Object.entries(size).map(([k, v]) => [`--size-${kebab(k)}`, `${v}px`]),
    ...Object.entries(elevation).map(([k, v]) => [`--elevation-${k}`, v]),
    ['--font-sans', `${fontFamily.sans}, system-ui, Roboto, 'Segoe UI', Helvetica, Arial, sans-serif`],
    ['--font-mono', fontFamily.mono],
  ];
  return entries.map(([k, v]) => `${k}: ${v};`).join(' ');
}
