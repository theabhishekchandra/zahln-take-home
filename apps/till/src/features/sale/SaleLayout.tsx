import { hero } from '@zahln/ui-tokens';
import { useTheme } from '@zahln/ui-native';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Width of the right-hand panel on every till screen. */
export const PANEL_WIDTH = 400;

export interface SaleLayoutProps {
  /** `hero`: deep brand (the QR). `brand`: paid. `surface`: everything else. */
  readonly ground: 'hero' | 'brand' | 'surface';
  readonly main: ReactNode;
  readonly panel: ReactNode;
}

/** The till's landscape layout: the message on the left, the order and its actions on the right. */
export function SaleLayout({ ground, main, panel }: SaleLayoutProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const background = { hero: hero.ground, brand: theme.colors.brand, surface: theme.colors.surface }[ground];
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing[5],
          paddingTop: insets.top + theme.spacing[6],
          paddingBottom: insets.bottom + theme.spacing[6],
          paddingLeft: insets.left + theme.spacing[8],
          paddingRight: theme.spacing[8],
        }}>
        {main}
      </ScrollView>
      <View
        style={{
          width: PANEL_WIDTH,
          backgroundColor: theme.colors.surfaceRaised,
          paddingTop: insets.top + theme.spacing[6],
          paddingBottom: insets.bottom + theme.spacing[6],
          paddingRight: insets.right + theme.spacing[6],
          paddingLeft: theme.spacing[6],
          gap: theme.spacing[4],
        }}>
        {panel}
      </View>
    </View>
  );
}

/** Pushes the panel's actions to its bottom edge. */
export function PanelActions({ children }: { readonly children: ReactNode }) {
  const theme = useTheme();
  return <View style={{ marginTop: 'auto', gap: theme.spacing[3] }}>{children}</View>;
}
