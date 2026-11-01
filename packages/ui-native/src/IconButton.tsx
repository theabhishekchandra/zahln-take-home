import { Pressable } from 'react-native';

import { Icon, type IconName } from './Icon';
import { useTheme } from './theme';

export interface IconButtonProps {
  readonly icon: IconName;
  /** Always spoken, e.g. "Cancel and go back". */
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
}

/** 48 dp round button on a raised surface. */
export function IconButton({ icon, accessibilityLabel, onPress }: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: theme.size.tapMin,
        height: theme.size.tapMin,
        borderRadius: theme.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? theme.colors.pressed : theme.colors.surfaceRaised,
        boxShadow: theme.elevation.card,
      })}>
      <Icon name={icon} size={20} strokeWidth={2.4} color={theme.colors.ink} />
    </Pressable>
  );
}
