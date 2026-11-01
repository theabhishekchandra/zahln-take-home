import type { MenuItem, Ticket } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, useTheme } from '@zahln/ui-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { itemTags } from './item-tags';
import { ItemTile } from './ItemTile';

/** Tiles per row by the width the menu gets. */
function columnsFor(width: number): number {
  if (width >= 900) return 4;
  if (width >= 520) return 3;
  return 2;
}

export interface MenuPanelProps {
  readonly menu: readonly MenuItem[];
  readonly ticket: Ticket;
  readonly online: boolean;
  readonly locked: boolean;
  readonly onAdd: (item: MenuItem) => void;
}

/** The mensa's items, as Zahln lists them. */
export function MenuPanel({ menu, ticket, online, locked, onAdd }: MenuPanelProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const [width, setWidth] = useState(0);
  const columns = columnsFor(width);
  const gap = theme.spacing[3] + 2;
  const tileWidth = width > 0 ? (width - gap * (columns - 1)) / columns : 0;
  const quantity = (item: MenuItem) => ticket.find((line) => line.itemId === item.id)?.quantity ?? 0;
  const tags = itemTags(menu.map((item) => format.text(item.name)));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: theme.spacing[5], gap: theme.spacing[3] }}>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {tileWidth > 0
          ? menu.map((item) => (
              <View key={item.id} style={{ width: tileWidth }}>
                <ItemTile item={item} tag={tags.get(format.text(item.name)) ?? ''} quantity={quantity(item)} showPrices={online} disabled={locked} onAdd={() => onAdd(item)} />
              </View>
            ))
          : null}
      </View>
      {online ? (
        <AppText variant="caption" tone="muted">
          {t('till.register.footnote')}
        </AppText>
      ) : null}
    </ScrollView>
  );
}
