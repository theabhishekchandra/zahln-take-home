import type { ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { AppText } from './AppText';
import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { useTheme } from './theme';

export interface SettingsRowProps {
  readonly icon: IconName;
  /** Payment settings are brand, app settings staff violet (design screen 19). */
  readonly tint?: 'brand' | 'staff';
  readonly label: string;
  readonly description?: string;
  /** A switch at the end; the whole row toggles it. */
  readonly toggle?: { readonly value: boolean; readonly onChange: (value: boolean) => void; readonly disabled?: boolean };
  /** A link to another screen, shown with a chevron. */
  readonly onPress?: () => void;
  /** Any other control at the end, e.g. a segmented control. */
  readonly accessory?: ReactNode;
  readonly divider?: boolean;
}

/** One row of a settings card: icon tile, label and description, then a switch, chevron or control. At least 60 dp. */
export function SettingsRow({ icon, tint = 'brand', label, description, toggle, onPress, accessory, divider = false }: SettingsRowProps) {
  const theme = useTheme();
  const tile = tint === 'staff' ? theme.colors.staffTint : theme.colors.brandTint;
  const glyph = tint === 'staff' ? theme.colors.staff : theme.colors.brand;
  const press = toggle ? (toggle.disabled ? undefined : () => toggle.onChange(!toggle.value)) : onPress;
  const disabled = toggle?.disabled ?? false;

  const content = (
    <>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          backgroundColor: tile,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={icon} size={19} strokeWidth={1.9} color={glyph} />
      </View>
      <View style={{ flex: 1, opacity: disabled ? 0.6 : 1 }}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? (
          <AppText variant="caption" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          disabled={disabled}
          // The row is the control; the switch only shows its state.
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          trackColor={{ false: theme.colors.lineDisabled, true: theme.colors.brand }}
          thumbColor={theme.colors.surfaceRaised}
          ios_backgroundColor={theme.colors.lineDisabled}
        />
      ) : onPress ? (
        <Icon name="chevronRight" size={20} strokeWidth={2.2} color={theme.colors.inkMuted} />
      ) : (
        accessory
      )}
    </>
  );

  const rowStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    minHeight: 60,
    paddingVertical: theme.spacing[2],
    borderBottomWidth: divider ? 1 : 0,
    borderBottomColor: theme.colors.divider,
  } as const;

  if (!press) {
    return (
      <View
        style={rowStyle}
        accessible={toggle !== undefined || accessory === undefined}
        accessibilityRole={toggle ? 'switch' : undefined}
        accessibilityState={toggle ? { checked: toggle.value, disabled } : undefined}
        accessibilityLabel={toggle || accessory === undefined ? [label, description].filter(Boolean).join('. ') : undefined}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole={toggle ? 'switch' : 'button'}
      accessibilityState={toggle ? { checked: toggle.value } : undefined}
      accessibilityLabel={[label, description].filter(Boolean).join('. ')}
      onPress={press}
      style={({ pressed }) => [rowStyle, { opacity: pressed ? 0.7 : 1 }]}>
      {content}
    </Pressable>
  );
}

/** A titled card of `SettingsRow`s. */
export function SettingsGroup({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing[2] }}>
      <AppText variant="label" tone="muted" accessibilityRole="header" style={{ fontSize: 13, marginHorizontal: 6 }}>
        {title}
      </AppText>
      <Card style={{ paddingHorizontal: 14, paddingVertical: 0 }}>{children}</Card>
    </View>
  );
}
