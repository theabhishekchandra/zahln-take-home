import { AppText, Card, useTheme } from '@zahln/ui-native';
import { View } from 'react-native';

export interface StatCardProps {
  readonly label: string;
  readonly value: string;
  readonly spokenValue?: string;
  readonly note: string;
  readonly tone?: 'ink' | 'brand';
}

/** A figure with its label and a note, e.g. "Spent in October · €56.70 · 14 payments". */
export function StatCard({ label, value, spokenValue, note, tone = 'ink' }: StatCardProps) {
  const theme = useTheme();
  return (
    <Card style={{ flex: 1, paddingVertical: 14, paddingHorizontal: theme.spacing[4] }}>
      <View accessible accessibilityLabel={`${label}: ${spokenValue ?? value}. ${note}`}>
        <AppText variant="label" tone="muted">
          {label}
        </AppText>
        <AppText variant="titleM" tone={tone} style={{ fontVariant: ['tabular-nums'], marginTop: 2 }} adjustsFontSizeToFit numberOfLines={1}>
          {value}
        </AppText>
        <AppText variant="caption" tone="muted" style={{ fontSize: 12 }}>
          {note}
        </AppText>
      </View>
    </Card>
  );
}
