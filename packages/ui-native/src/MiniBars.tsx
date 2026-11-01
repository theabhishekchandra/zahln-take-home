import { View } from 'react-native';

import { useTheme } from './theme';

export interface MiniBarsProps {
  /** Any unit; bars are scaled to the largest. */
  readonly values: readonly number[];
  /** Read instead of the bars, e.g. "Spending by week: 14, 18, 16 and 9 euros". */
  readonly accessibilityLabel: string;
  readonly height?: number;
}

/** A few small bars, the last one (now) in brand, e.g. spending by week (design screen 15). */
export function MiniBars({ values, accessibilityLabel, height = 56 }: MiniBarsProps) {
  const theme = useTheme();
  const max = Math.max(...values, 1);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height }}>
      {values.map((value, index) => (
        <View
          key={index}
          style={{
            width: 14,
            // A sliver for an empty week, so it still reads as a week.
            height: Math.max(4, (value / max) * height),
            borderRadius: 5,
            backgroundColor: index === values.length - 1 ? theme.colors.brand : theme.colors.brandTint,
          }}
        />
      ))}
    </View>
  );
}
