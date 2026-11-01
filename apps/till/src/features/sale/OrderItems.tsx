import type { OrderItem } from '@zahln/domain';
import { useFormat } from '@zahln/i18n';
import { AppText, useTheme } from '@zahln/ui-native';
import { View } from 'react-native';

/** The order's items as the server has them, in a tinted box: "1× Schnitzel mit Kartoffelsalat". */
export function OrderItems({ items }: { readonly items: readonly OrderItem[] }) {
  const theme = useTheme();
  const format = useFormat();
  return (
    <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, paddingHorizontal: theme.spacing[4] }}>
      {items.map((item, index) => (
        <AppText
          key={item.itemId}
          style={{
            paddingVertical: 11,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: theme.colors.disabledFill,
          }}>
          {`${item.quantity}× ${format.text(item.name)}`}
        </AppText>
      ))}
    </View>
  );
}
