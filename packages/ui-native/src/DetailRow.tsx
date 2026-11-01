import { View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './theme';

export interface DetailRowProps {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'ink' | 'brand';
  readonly mono?: boolean;
  readonly divider?: boolean;
}

/** "Label ........ value" inside a card: receipts, payment details, order lines. */
export function DetailRow({ label, value, tone = 'ink', mono = false, divider = true }: DetailRowProps) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: theme.spacing[3],
        paddingVertical: theme.spacing[3],
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: theme.colors.divider,
      }}>
      <AppText tone="muted" style={{ flexShrink: 1 }}>
        {label}
      </AppText>
      <AppText
        variant="bodyStrong"
        tone={tone}
        selectable={mono}
        // An amount never breaks across lines; the label wraps instead. Long IDs may still wrap.
        style={{ textAlign: 'right', flexShrink: mono ? 1 : 0, fontVariant: ['tabular-nums'], ...(mono ? { fontFamily: theme.monoFamily, fontSize: 14 } : {}) }}>
        {value}
      </AppText>
    </View>
  );
}
