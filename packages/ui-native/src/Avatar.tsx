import { View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './theme';

export interface AvatarProps {
  readonly initials: string;
  readonly size?: number;
  readonly shape?: 'tile' | 'circle';
  /** Brand fill marks the selected or signed-in person. */
  readonly selected?: boolean;
}

/** Initials in a tile. Decorative: the name next to it is what gets read. */
export function Avatar({ initials, size = 44, shape = 'tile', selected = false }: AvatarProps) {
  const theme = useTheme();
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: shape === 'circle' ? theme.radius.pill : 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? theme.colors.brand : theme.colors.divider,
      }}>
      <AppText variant="bodyStrong" tone={selected ? 'onBrand' : 'ink'} maxFontSizeMultiplier={1.2}>
        {initials}
      </AppText>
    </View>
  );
}

const TITLES = new Set(['dr.', 'prof.']);

/** "Lena Fischer" → "LF", "Dr. Jonas Weber" → "JW", "A. Yilmaz" → "AY". */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter((word) => word && !TITLES.has(word.toLowerCase()))
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
