import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from './AppText';
import { fontFiles, useTheme } from './theme';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  readonly label: string;
  readonly hint?: string;
  /** Shown below the field with a danger border; never colour alone. */
  readonly error?: string;
}

/** Labelled input, 48 dp, 2 dp focus ring. */
export function TextField({ label, hint, error, ...props }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: theme.spacing[2] }}>
      <AppText variant="bodyStrong">{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={theme.colors.inkMuted}
        maxFontSizeMultiplier={2}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          minHeight: theme.size.tapMin,
          paddingHorizontal: theme.spacing[3],
          borderRadius: theme.radius.control,
          borderWidth: focused || error ? 2 : 1,
          borderColor: error ? theme.colors.danger : focused ? theme.colors.focus : theme.colors.line,
          backgroundColor: theme.colors.surfaceRaised,
          color: theme.colors.ink,
          fontFamily: fontFiles[400],
          fontSize: 16,
        }}
        {...props}
      />
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="assertive">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
