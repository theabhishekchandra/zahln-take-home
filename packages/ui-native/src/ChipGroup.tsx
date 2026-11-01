import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './theme';

export interface ChipOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

export interface ChipGroupProps<T extends string> {
  readonly options: readonly ChipOption<T>[];
  readonly selected: T | null;
  readonly onSelect: (value: T) => void;
  /** `tablist` switches what is shown below; `radiogroup` picks a value. */
  readonly role: 'tablist' | 'radiogroup';
  readonly accessibilityLabel: string;
  /** Visual height; the touch target is grown to the till's 64 dp around it. */
  readonly height?: number;
  /** Wrap onto more lines instead of scrolling sideways, e.g. in a narrow card. */
  readonly wrap?: boolean;
}

/** A row of pills, one selected (ink fill). Scrolls sideways when it does not fit, or wraps. */
export function ChipGroup<T extends string>({
  options,
  selected,
  onSelect,
  role,
  accessibilityLabel,
  height = 48,
  wrap = false,
}: ChipGroupProps<T>) {
  const theme = useTheme();
  const slop = Math.max(0, (theme.size.tapTill - height) / 2);
  const chips = (
    <View
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        flexWrap: wrap ? 'wrap' : 'nowrap',
        gap: theme.spacing[2],
        rowGap: wrap ? slop * 2 + theme.spacing[2] : undefined,
      }}>
      {options.map((option) => {
        const on = option.value === selected;
        return (
          <Pressable
            key={option.value}
            accessibilityRole={role === 'tablist' ? 'tab' : 'radio'}
            accessibilityState={{ selected: on, checked: role === 'radiogroup' ? on : undefined }}
            hitSlop={{ top: slop, bottom: slop }}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => ({
              minHeight: height,
              paddingHorizontal: theme.spacing[5],
              borderRadius: theme.radius.pill,
              justifyContent: 'center',
              backgroundColor: on ? theme.colors.ink : pressed ? theme.colors.pressed : theme.colors.surfaceRaised,
              boxShadow: on ? undefined : theme.elevation.card,
            })}>
            <AppText
              variant="bodyStrong"
              style={{ fontSize: 15, color: on ? theme.colors.surfaceRaised : theme.colors.ink }}
              maxFontSizeMultiplier={1.4}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
  if (wrap) return <View style={{ paddingVertical: slop }}>{chips}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingVertical: slop }}>
      {chips}
    </ScrollView>
  );
}
