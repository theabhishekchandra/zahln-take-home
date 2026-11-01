import { hero } from '@zahln/ui-tokens';
import { View, type ViewStyle } from 'react-native';

const CELLS = [1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1];

/** The faint QR-like tiles in the corner of a deep-brand hero. Decorative. */
export function HeroPattern({ style }: { readonly style?: Pick<ViewStyle, 'top' | 'right' | 'bottom' | 'left'> }) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      pointerEvents="none"
      style={[{ position: 'absolute', right: -40, top: 64, width: 172, flexDirection: 'row', flexWrap: 'wrap', gap: 8, opacity: 0.16 }, style]}>
      {CELLS.map((on, index) => (
        <View key={index} style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: on ? hero.ink : 'transparent' }} />
      ))}
    </View>
  );
}
