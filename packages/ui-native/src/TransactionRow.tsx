import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from './AppText';
import { Icon } from './Icon';
import { useTheme } from './theme';

export interface TransactionRowProps {
  readonly title: string;
  /** "Today, 11:48 · Till 1" */
  readonly subtitle: string;
  /** Formatted, with "−" for money out. */
  readonly amount: string;
  readonly status: ReactNode;
  /** Declined amounts are struck through. */
  readonly struck?: boolean;
  readonly tint?: 'brand' | 'staff';
  /** Read as one sentence: "Mensa Zentral, today 11:48, minus 5 euros 30, paid". */
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
  readonly divider?: boolean;
}

/** At least 64 dp; the whole row is one tap target. */
export function TransactionRow({
  title,
  subtitle,
  amount,
  status,
  struck = false,
  tint = 'brand',
  accessibilityLabel,
  onPress,
  divider = false,
}: TransactionRowProps) {
  const theme = useTheme();
  const tile = tint === 'staff' ? theme.colors.staffTint : theme.colors.brandTint;
  const glyph = tint === 'staff' ? theme.colors.staff : theme.colors.brand;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[3],
        minHeight: theme.size.row,
        paddingVertical: theme.spacing[2],
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: theme.colors.divider,
        opacity: pressed ? 0.7 : 1,
      })}>
      <View
        style={{
          width: theme.size.iconTile,
          height: theme.size.iconTile,
          borderRadius: theme.radius.tile,
          backgroundColor: tile,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name="mensa" size={20} strokeWidth={1.8} color={glyph} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" tone="muted">
          {subtitle}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <AppText variant="bodyStrong" style={{ fontVariant: ['tabular-nums'], textDecorationLine: struck ? 'line-through' : 'none' }}>
          {amount}
        </AppText>
        {status}
      </View>
    </Pressable>
  );
}
