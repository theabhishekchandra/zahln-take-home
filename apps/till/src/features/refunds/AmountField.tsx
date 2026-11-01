import { AppText, fontFiles, useTheme } from '@zahln/ui-native';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

export interface AmountFieldProps {
  readonly label: string;
  readonly hint: string;
  readonly value: string;
  readonly onChange: (text: string) => void;
  /** The server refused this amount; the reason is shown next to the field. */
  readonly invalid: boolean;
  readonly invalidMessage?: string;
  readonly editable: boolean;
}

/** A large euro amount field, as on the till's refund panel. */
export function AmountField({ label, hint, value, onChange, invalid, invalidMessage, editable }: AmountFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: theme.spacing[2] }}>
      <AppText variant="label" tone="muted" style={{ fontSize: 13 }}>
        {label}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[2],
          minHeight: theme.size.tapTill,
          paddingHorizontal: theme.spacing[4],
          borderRadius: theme.radius.control,
          borderWidth: 2,
          borderColor: invalid ? theme.colors.danger : focused ? theme.colors.brand : theme.colors.line,
          backgroundColor: invalid ? theme.colors.dangerTint : theme.colors.surfaceRaised,
        }}>
        <AppText variant="titleM" tone="muted" importantForAccessibility="no" accessibilityElementsHidden>
          €
        </AppText>
        <TextInput
          value={value}
          onChangeText={onChange}
          editable={editable}
          inputMode="decimal"
          keyboardType="decimal-pad"
          accessibilityLabel={label}
          accessibilityHint={invalid && invalidMessage ? invalidMessage : hint}
          placeholder={hint}
          placeholderTextColor={theme.colors.inkMuted}
          maxFontSizeMultiplier={1.4}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            minHeight: 56,
            color: invalid ? theme.colors.danger : theme.colors.ink,
            fontFamily: fontFiles[700],
            fontSize: 28,
            fontVariant: ['tabular-nums'],
          }}
        />
      </View>
    </View>
  );
}
