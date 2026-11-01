import { View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './theme';

export interface PillProps {
  readonly label: string;
  readonly tone?: 'brand' | 'staff' | 'neutral';
  /** E.g. the review timer: read only on focus, never interrupting. */
  readonly accessibilityRole?: 'timer' | 'text';
  readonly accessibilityLabel?: string;
}

/** Small rounded label: price-group chip, code timer, "PIN saved". */
export function Pill({ label, tone = 'brand', accessibilityRole = 'text', accessibilityLabel }: PillProps) {
  const theme = useTheme();
  const look = {
    brand: { fill: theme.colors.brandTint, ink: theme.colors.brand },
    staff: { fill: theme.colors.staffTint, ink: theme.colors.staff },
    neutral: { fill: theme.colors.surfaceRaised, ink: theme.colors.ink },
  }[tone];
  return (
    <View
      accessible
      accessibilityRole={accessibilityRole === 'timer' ? 'timer' : 'text'}
      accessibilityLabel={accessibilityLabel ?? label}
      style={{
        alignSelf: 'center',
        minHeight: 30,
        justifyContent: 'center',
        paddingVertical: 5,
        paddingHorizontal: theme.spacing[3],
        borderRadius: theme.radius.pill,
        backgroundColor: look.fill,
        boxShadow: tone === 'neutral' ? theme.elevation.card : undefined,
      }}>
      <AppText variant="label" style={{ color: look.ink, fontVariant: ['tabular-nums'] }}>
        {label}
      </AppText>
    </View>
  );
}
