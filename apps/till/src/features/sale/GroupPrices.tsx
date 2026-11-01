import { PRICE_GROUPS, type Money, type PriceGroup } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, useTheme, type Theme } from '@zahln/ui-native';
import { View } from 'react-native';

export interface GroupPricesProps {
  readonly totals: Readonly<Record<PriceGroup, Money>>;
  /** `row`: one line under the ticket. `tiles`: tinted tiles beside the QR. */
  readonly look: 'row' | 'tiles';
}

export function groupTint(theme: Theme, group: PriceGroup) {
  return {
    student: { fill: theme.colors.brandTint, ink: theme.colors.brand },
    staff: { fill: theme.colors.staffTint, ink: theme.colors.staff },
    guest: { fill: theme.colors.pressed, ink: theme.colors.inkSecondary },
  }[group];
}

/**
 * The total for every price group. The till never picks one: the group is
 * settled by the server when the person scans.
 */
export function GroupPrices({ totals, look }: GroupPricesProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  return (
    <View style={{ flexDirection: 'row', gap: look === 'tiles' ? theme.spacing[2] : theme.spacing[3] }}>
      {PRICE_GROUPS.map((group) => {
        const tint = groupTint(theme, group);
        return (
          <View
            key={group}
            accessible
            accessibilityLabel={`${t(`priceGroup.${group}`)} ${format.money(totals[group])}`}
            style={{
              flex: 1,
              gap: 2,
              ...(look === 'tiles' ? { backgroundColor: tint.fill, borderRadius: 14, padding: theme.spacing[3] } : null),
            }}>
            <AppText variant="caption" style={{ color: look === 'tiles' ? tint.ink : theme.colors.inkMuted }}>
              {t(`priceGroup.${group}`)}
            </AppText>
            <AppText variant="titleS" style={{ fontSize: 18, fontVariant: ['tabular-nums'] }}>
              {format.money(totals[group])}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}
