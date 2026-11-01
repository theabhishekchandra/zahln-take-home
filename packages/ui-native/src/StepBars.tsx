import { View } from 'react-native';

import { useTheme } from './theme';

/** "Step 2 of 3" as short bars, for flows of a few screens (design screen 20). */
export function StepBars({ step, total, accessibilityLabel }: { readonly step: number; readonly total: number; readonly accessibilityLabel: string }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 1, max: total, now: step }}
      style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={{ width: 24, height: 5, borderRadius: 3, backgroundColor: index < step ? theme.colors.brand : theme.colors.lineDisabled }}
        />
      ))}
    </View>
  );
}
