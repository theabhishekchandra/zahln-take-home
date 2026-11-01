import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from './Icon';
import { fontFiles, useTheme } from './theme';

export interface SearchFieldProps extends Omit<TextInputProps, 'style' | 'accessibilityLabel'> {
  /** Spoken; the placeholder alone is not a label. */
  readonly label: string;
}

/** Search box with a magnifier, 46 dp, on a raised surface. */
export function SearchField({ label, ...props }: SearchFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: 46,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: theme.colors.surfaceRaised,
        borderWidth: 2,
        borderColor: focused ? theme.colors.focus : 'transparent',
        boxShadow: theme.elevation.card,
      }}>
      <Icon name="search" size={18} color={theme.colors.inkMuted} />
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.inkMuted}
        returnKeyType="search"
        clearButtonMode="while-editing"
        maxFontSizeMultiplier={2}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, minHeight: 44, color: theme.colors.ink, fontFamily: fontFiles[400], fontSize: 15 }}
        {...props}
      />
    </View>
  );
}
