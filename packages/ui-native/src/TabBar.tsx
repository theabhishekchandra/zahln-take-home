import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { useTheme } from './theme';

export interface TabBarItem {
  readonly key: string;
  readonly label: string;
  readonly icon: IconName;
  readonly selected: boolean;
  readonly onPress: () => void;
}

/** Bottom navigation: raised bar, 56 dp items, the selected one tinted with a filled icon. */
export function TabBar({ items, accessibilityLabel }: { readonly items: readonly TabBarItem[]; readonly accessibilityLabel: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        gap: 6,
        paddingTop: theme.spacing[2],
        paddingHorizontal: 10,
        paddingBottom: Math.max(insets.bottom, theme.spacing[3]) + 6,
        backgroundColor: theme.colors.surfaceRaised,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        boxShadow: theme.elevation.bar,
      }}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="tab"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: item.selected }}
          onPress={item.onPress}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 56,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            borderRadius: theme.radius.control,
            backgroundColor: item.selected ? theme.colors.brandTint : pressed ? theme.colors.pressed : 'transparent',
          })}>
          <Icon
            name={item.icon}
            size={23}
            strokeWidth={1.9}
            filled={item.selected && item.icon === 'home'}
            color={item.selected ? theme.colors.brand : theme.colors.inkMuted}
          />
          <AppText variant="label" tone={item.selected ? 'brand' : 'muted'} maxFontSizeMultiplier={1.3}>
            {item.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
