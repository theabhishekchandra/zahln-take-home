import type { Quote } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, Icon, Pill, useTheme } from '@zahln/ui-native';
import { View } from 'react-native';

/** Who is being paid and how much: the mensa, the till and the server's amount for this payer. */
export function MerchantSummary({ quote, showPriceGroup = false }: { readonly quote: Quote; readonly showPriceGroup?: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  return (
    <View style={{ alignItems: 'center', marginTop: theme.spacing[2] }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: theme.radius.card,
          backgroundColor: theme.colors.brand,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name="mensa" size={32} strokeWidth={1.8} color={theme.colors.onBrand} />
      </View>
      <AppText variant="titleS" accessibilityRole="header" style={{ marginTop: theme.spacing[3], textAlign: 'center' }}>
        {quote.mensa.name}
      </AppText>
      <AppText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        {quote.till.name}
      </AppText>
      <AppText
        variant="amount"
        accessibilityLabel={format.moneySpoken(quote.total)}
        adjustsFontSizeToFit
        numberOfLines={1}
        style={{ marginTop: 10 }}>
        {format.money(quote.total)}
      </AppText>
      {showPriceGroup ? (
        <View style={{ marginTop: theme.spacing[1] }}>
          <Pill label={t(`priceApplied.${quote.priceGroup}`)} tone={quote.priceGroup === 'staff' ? 'staff' : 'brand'} />
        </View>
      ) : null}
    </View>
  );
}
