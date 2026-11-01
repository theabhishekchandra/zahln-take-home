import type { Colors, TypographyVariant } from '@zahln/ui-tokens';
import { Text, type TextProps } from 'react-native';

import { fontFiles, useTheme } from './theme';

export type TextTone = 'ink' | 'secondary' | 'muted' | 'brand' | 'onBrand' | 'success' | 'pending' | 'danger' | 'staff';

const toneColor: Readonly<Record<TextTone, keyof Colors>> = {
  ink: 'ink',
  secondary: 'inkSecondary',
  muted: 'inkMuted',
  brand: 'brand',
  onBrand: 'onBrand',
  success: 'success',
  pending: 'pending',
  danger: 'danger',
  staff: 'staff',
};

const headings: ReadonlySet<TypographyVariant> = new Set(['titleL', 'titleM', 'titleS']);

export interface AppTextProps extends TextProps {
  readonly variant?: TypographyVariant;
  readonly tone?: TextTone;
}

/** Text that follows the theme and the user's font size (up to 200 %). Titles are announced as headers. */
export function AppText({ variant = 'body', tone = 'ink', style, ...props }: AppTextProps) {
  const theme = useTheme();
  const { fontSize, lineHeight, fontWeight, ...token } = theme.typography[variant];
  return (
    <Text
      accessibilityRole={headings.has(variant) ? 'header' : undefined}
      maxFontSizeMultiplier={2}
      style={[
        {
          fontFamily: fontFiles[fontWeight],
          fontSize,
          lineHeight,
          letterSpacing: 'letterSpacing' in token ? token.letterSpacing : undefined,
          fontVariant: 'tabular' in token ? ['tabular-nums'] : undefined,
          color: theme.colors[toneColor[tone]],
        },
        style,
      ]}
      {...props}
    />
  );
}
