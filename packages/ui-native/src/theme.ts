import { colors, elevation, motion, radius, size, spacing, typography, type FontWeight } from '@zahln/ui-tokens';
import { Platform, useColorScheme } from 'react-native';

/**
 * Manrope (files in @zahln/ui-tokens) is embedded at build time by the expo-font
 * config plugin, one file per weight.
 * Android names a family after its file and iOS accepts the PostScript name, which
 * are the same here, so each weight is its own family and `fontWeight` is never set
 * (setting it on a custom family makes Android fake the weight).
 */
export const fontFiles: Readonly<Record<FontWeight, string>> = {
  400: 'Manrope-Regular',
  600: 'Manrope-SemiBold',
  700: 'Manrope-Bold',
};

/** Platform monospace for payment IDs. */
const monoFamily = Platform.select({ ios: 'Menlo', default: 'monospace' });

export function useTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: colors[scheme], spacing, radius, typography, size, elevation, motion, monoFamily } as const;
}

export type Theme = ReturnType<typeof useTheme>;
