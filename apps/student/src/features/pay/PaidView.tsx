import type { Payment, PaymentIntent } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { announce, AppText, Button, Card, DetailRow, ResultIcon, useTheme } from '@zahln/ui-native';
import { hero } from '@zahln/ui-tokens';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Design screen 10. Every figure comes from the server's payment, not from what the app sent. */
export function PaidView({ intent, payment, onDone }: { readonly intent: PaymentIntent; readonly payment: Payment; readonly onDone: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const format = useFormat();
  const { mensa, till } = intent.quote;
  const tillName = till.name;

  useEffect(() => announce(t('paid.spoken', { amount: format.moneySpoken(payment.amount), mensa: mensa.name })), [t, format, payment.amount, mensa.name]);

  return (
    <View style={{ flex: 1, backgroundColor: hero.ground }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 64, paddingHorizontal: theme.spacing[4], gap: theme.spacing[6] }}>
        <View accessible accessibilityRole="summary" style={{ alignItems: 'center' }}>
          <ResultIcon icon="tick" color={hero.ground} background={hero.ink} />
          <AppText variant="bodyStrong" style={{ color: hero.inkMuted, marginTop: 22 }}>
            {t('paid.title')}
          </AppText>
          <AppText
            variant="amount"
            accessibilityLabel={format.moneySpoken(payment.amount)}
            style={{ color: hero.ink, fontSize: 56, lineHeight: 62 }}
            adjustsFontSizeToFit
            numberOfLines={1}>
            {format.money(payment.amount)}
          </AppText>
          <AppText style={{ color: hero.inkMuted }}>{t('paid.to', { mensa: mensa.name, till: tillName })}</AppText>
        </View>
        <Card style={{ paddingVertical: 6, paddingHorizontal: 18 }}>
          <DetailRow label={t('paid.date')} value={format.dateTime(payment.createdAt)} />
          <DetailRow label={t('paid.priceGroup')} value={t(`priceGroup.${payment.priceGroup}`)} />
          <DetailRow label={t('paid.fee')} value={format.money({ cents: 0, currency: payment.amount.currency })} tone="brand" />
          <DetailRow label={t('common.paymentId')} value={payment.id} mono divider={false} />
        </Card>
      </ScrollView>
      <View style={{ paddingHorizontal: theme.spacing[5], paddingTop: theme.spacing[3], paddingBottom: insets.bottom + theme.spacing[5] }}>
        <Button label={t('common.done')} variant="onHero" onPress={onDone} />
      </View>
    </View>
  );
}
