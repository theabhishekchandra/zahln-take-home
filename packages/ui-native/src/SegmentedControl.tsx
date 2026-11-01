import { Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './theme';

export interface SegmentedControlProps<T extends string> {
  readonly options: readonly { readonly value: T; readonly label: string; readonly accessibilityLabel?: string }[];
  readonly selected: T;
  readonly onSelect: (value: T) => void;
  readonly accessibilityLabel: string;
  /** `tablist` switches what is shown below; `radiogroup` (default) picks a value. */
  readonly role?: 'radiogroup' | 'tablist';
  /** `large`: the till's 48 dp segments. */
  readonly size?: 'regular' | 'large';
}

/** Side-by-side segments on a grey track, the selected one raised, e.g. DE | EN. Regular segments are 44 × 32 dp inside a 48 dp row. */
export function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
  accessibilityLabel,
  role = 'radiogroup',
  size = 'regular',
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const large = size === 'large';
  return (
    <View
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', backgroundColor: theme.colors.pressed, borderRadius: large ? 14 : 10, padding: large ? 4 : 3 }}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={option.value}
            accessibilityRole={role === 'tablist' ? 'tab' : 'radio'}
            accessibilityState={role === 'tablist' ? { selected: isSelected } : { checked: isSelected }}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            onPress={() => onSelect(option.value)}
            hitSlop={{ top: 8, bottom: 8 }}
            style={{
              minWidth: 44,
              minHeight: large ? 48 : 32,
              paddingHorizontal: large ? theme.spacing[5] : theme.spacing[2],
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: large ? 10 : 8,
              backgroundColor: isSelected ? theme.colors.surfaceRaised : 'transparent',
              boxShadow: isSelected ? '0 1px 3px rgba(0, 0, 0, 0.12)' : undefined,
            }}>
            <AppText variant={large ? 'bodyStrong' : 'label'} tone={isSelected ? 'ink' : 'muted'} style={{ fontSize: large ? 15 : 13 }}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
