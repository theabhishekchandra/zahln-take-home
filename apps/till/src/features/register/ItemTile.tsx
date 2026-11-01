import { PRICE_GROUPS, type MenuItem } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, useTheme, type Theme } from '@zahln/ui-native';
import { Pressable, View } from 'react-native';

import { groupTint } from '@/features/sale/GroupPrices';

export interface ItemTileProps {
  readonly item: MenuItem;
  /** "VEG": see `itemTags`. */
  readonly tag: string;
  readonly quantity: number;
  /** Offline the prices are hidden: nothing can be charged until Zahln is back. */
  readonly showPrices: boolean;
  readonly disabled: boolean;
  readonly onAdd: () => void;
}

/** Each item keeps its own tint, so neighbouring tiles look different. */
function itemTint(theme: Theme, id: string) {
  const tints = [
    { fill: theme.colors.brandTint, ink: theme.colors.brand },
    { fill: theme.colors.staffTint, ink: theme.colors.staff },
    { fill: theme.colors.pendingTint, ink: theme.colors.pending },
    { fill: theme.colors.successTint, ink: theme.colors.success },
  ];
  const hash = [...id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9973, 0);
  return tints[hash % tints.length]!;
}

/** One menu item. A tap adds one to the order. */
export function ItemTile({ item, tag, quantity, showPrices, disabled, onAdd }: ItemTileProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const name = format.text(item.name);
  const selected = quantity > 0;
  const tint = itemTint(theme, item.id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        showPrices
          ? t('till.register.itemSpoken', {
              name,
              student: format.money(item.prices.student),
              staff: format.money(item.prices.staff),
              guest: format.money(item.prices.guest),
            })
          : name
      }
      accessibilityValue={selected ? { text: t('till.register.inOrder', { count: quantity }) } : undefined}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onAdd}
      style={({ pressed }) => ({
        minHeight: showPrices ? 176 : 150,
        borderRadius: 22,
        padding: theme.spacing[4],
        gap: theme.spacing[3],
        backgroundColor: pressed ? theme.colors.pressed : theme.colors.surfaceRaised,
        boxShadow: selected ? `0 0 0 3px ${theme.colors.brand}` : theme.elevation.card,
        opacity: disabled ? 0.5 : 1,
      })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: tint.fill }}>
          <AppText variant="label" style={{ color: tint.ink, fontSize: 13 }} maxFontSizeMultiplier={1.2}>
            {tag}
          </AppText>
        </View>
        {selected ? (
          <View style={{ minWidth: 32, height: 32, borderRadius: 16, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.brand }}>
            <AppText variant="bodyStrong" tone="onBrand" style={{ fontVariant: ['tabular-nums'] }} maxFontSizeMultiplier={1.2}>
              {quantity}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="bodyStrong" style={{ fontSize: 18, lineHeight: 23, flex: 1 }} numberOfLines={3}>
        {name}
      </AppText>
      {showPrices ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {PRICE_GROUPS.map((group) => {
            const price = groupTint(theme, group);
            return (
              <View key={group} style={{ borderRadius: theme.radius.sm, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: price.fill }}>
                <AppText variant="label" style={{ color: price.ink, fontSize: 13, fontVariant: ['tabular-nums'] }} maxFontSizeMultiplier={1.3}>
                  {`${t(`till.groupShort.${group}`)} ${format.money(item.prices[group])}`}
                </AppText>
              </View>
            );
          })}
        </View>
      ) : null}
    </Pressable>
  );
}
