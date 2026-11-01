import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from './theme';

export interface ScreenProps {
  readonly children: ReactNode;
  readonly scroll?: boolean;
  /** Fixed bottom bar (e.g. Pay). Content scrolls above it; it is never pushed off screen. */
  readonly footer?: ReactNode;
}

/** Edge to edge, 20 dp gutter, content below the status bar, 14 dp vertical rhythm. */
export function Screen({ children, scroll = false, footer }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const content = {
    paddingTop: theme.spacing[2],
    paddingBottom: footer ? theme.spacing[6] : insets.bottom + theme.spacing[6],
    paddingHorizontal: theme.spacing[5],
    gap: 14,
    flexGrow: 1,
  } as const;
  return (
    // The status bar inset sits outside the scroll view, so scrolled content never runs under the clock.
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.colors.surface }}>
      {scroll ? (
        <ScrollView contentContainerStyle={content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={content}>{children}</View>
      )}
      {footer ? <BottomBar>{footer}</BottomBar> : null}
    </View>
  );
}

/** Raised bar with 28 dp top corners; bottom padding clears the gesture bar. */
export function BottomBar({ children }: { readonly children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceRaised,
        borderTopLeftRadius: theme.radius.sheet,
        borderTopRightRadius: theme.radius.sheet,
        paddingTop: 14,
        paddingHorizontal: theme.spacing[5],
        paddingBottom: Math.max(insets.bottom, theme.spacing[4]) + theme.spacing[3],
        gap: theme.spacing[3],
        boxShadow: theme.elevation.bar,
      }}>
      {children}
    </View>
  );
}
