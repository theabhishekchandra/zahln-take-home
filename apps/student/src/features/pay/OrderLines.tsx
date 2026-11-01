import { money, type Quote } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, Card, DetailRow, useTheme } from '@zahln/ui-native';
import { View } from 'react-native';

/** The order as the server priced it for this payer, and the fee, which is always zero. */
export function OrderLines({ quote }: { readonly quote: Quote }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  return (
    <Card style={{ paddingVertical: 6, paddingHorizontal: 18 }}>
      <View accessibilityRole="list" accessibilityLabel={t('review.order', { count: quote.lines.length })}>
        {quote.lines.map((line) => (
          <View
            key={line.itemId}
            accessible
            accessibilityLabel={t('review.lineSpoken', { quantity: line.quantity, name: format.text(line.name), amount: format.moneySpoken(line.total) })}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: theme.spacing[3],
              paddingVertical: theme.spacing[3],
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.divider,
            }}>
            <AppText style={{ flex: 1 }}>
              <AppText tone="muted">{`${line.quantity}× `}</AppText>
              {format.text(line.name)}
            </AppText>
            <AppText variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>
              {format.money(line.total)}
            </AppText>
          </View>
        ))}
      </View>
      <DetailRow label={t('common.fee')} value={format.money(money(0))} tone="brand" divider={false} />
    </Card>
  );
}
