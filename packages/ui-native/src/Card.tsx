import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from './theme';

/** Raised surface, radius 20, card elevation. */
export function Card({ children, style }: { readonly children: ReactNode; readonly style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderRadius: theme.radius.card,
          paddingHorizontal: theme.spacing[4],
          paddingVertical: theme.spacing[1],
          boxShadow: theme.elevation.card,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
