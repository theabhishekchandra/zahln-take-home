import { matchesPaymentSearch, paymentStanding, type Payment, type PaymentId, type PaymentStanding } from '@zahln/domain';
import { useFormat, useTranslation, type Format } from '@zahln/i18n';
import { AppText, fontFiles, Icon, StatusLabel, useTheme, type StatusKind } from '@zahln/ui-native';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

type T = ReturnType<typeof useTranslation>['t'];

export function standingLabel(payment: Payment, t: T, format: Format): { kind: StatusKind; label: string } {
  const standing: PaymentStanding = paymentStanding(payment);
  switch (standing) {
    case 'paid':
      return { kind: 'paid', label: t('till.refunds.status.paid') };
    case 'refunded':
      return { kind: 'refunded', label: t('till.refunds.status.refunded') };
    case 'partly_refunded':
      return { kind: 'refunded', label: t('till.refunds.status.partly', { amount: format.money(payment.refunded) }) };
    case 'checking':
      return { kind: 'checking', label: t('till.refunds.status.checking') };
    case 'declined':
      return { kind: 'declined', label: t('till.refunds.status.declined') };
  }
}

export interface PaymentListProps {
  readonly payments: readonly Payment[];
  readonly query: string;
  readonly onQuery: (query: string) => void;
  readonly selected: PaymentId | null;
  readonly onSelect: (id: PaymentId) => void;
  /** While a refund is in flight the cashier stays on its payment. */
  readonly locked: boolean;
}

/** T10, left: search and today's payments on this till. */
export function PaymentList({ payments, query, onQuery, selected, onSelect, locked }: PaymentListProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const shown = payments.filter((payment) => matchesPaymentSearch(payment, query, format.time));
  return (
    <View style={{ flex: 1, paddingVertical: 18, paddingHorizontal: theme.spacing[5], gap: theme.spacing[3] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing[2],
          minHeight: 56,
          paddingHorizontal: theme.spacing[4],
          borderRadius: theme.radius.control,
          backgroundColor: theme.colors.surfaceRaised,
          borderWidth: 1,
          borderColor: theme.colors.line,
        }}>
        <Icon name="search" size={20} color={theme.colors.inkMuted} />
        <TextInput
          value={query}
          onChangeText={onQuery}
          accessibilityLabel={t('till.refunds.search')}
          placeholder={t('till.refunds.searchHint')}
          placeholderTextColor={theme.colors.inkMuted}
          autoCorrect={false}
          autoCapitalize="none"
          inputMode="search"
          maxFontSizeMultiplier={1.6}
          style={{ flex: 1, minHeight: 48, color: theme.colors.ink, fontFamily: fontFiles[400], fontSize: 16 }}
        />
      </View>
      <AppText variant="label" tone="muted" accessibilityRole="header" style={{ fontSize: 14 }}>
        {t('till.refunds.today')}
      </AppText>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ backgroundColor: theme.colors.surfaceRaised, borderRadius: 22, padding: theme.spacing[2] }}>
        {shown.length === 0 ? (
          <AppText tone="muted" style={{ padding: theme.spacing[3] }}>
            {query ? t('till.refunds.noMatch', { query }) : t('till.refunds.empty')}
          </AppText>
        ) : (
          shown.map((payment) => {
            const on = payment.id === selected;
            const status = standingLabel(payment, t, format);
            const time = format.time(payment.createdAt);
            const group = t(`priceGroup.${payment.priceGroup}`);
            return (
              <Pressable
                key={payment.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: locked && !on }}
                accessibilityLabel={t('till.refunds.rowSpoken', { amount: format.moneySpoken(payment.amount), time, group, status: status.label })}
                disabled={locked && !on}
                onPress={() => onSelect(payment.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  minHeight: theme.size.tapTill,
                  paddingHorizontal: theme.spacing[3],
                  borderRadius: 14,
                  backgroundColor: on ? theme.colors.brandTint : pressed ? theme.colors.pressed : 'transparent',
                  borderWidth: 2,
                  borderColor: on ? theme.colors.brand : 'transparent',
                  opacity: locked && !on ? 0.5 : 1,
                })}>
                <AppText variant="bodyStrong" style={{ width: 76, fontSize: 17, fontVariant: ['tabular-nums'] }}>
                  {format.money(payment.amount)}
                </AppText>
                <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                  {`${time} · `}
                  <AppText variant="caption" tone="muted" style={{ fontFamily: theme.monoFamily }}>
                    {payment.id}
                  </AppText>
                  {` · ${group}`}
                </AppText>
                <StatusLabel kind={status.kind} label={status.label} />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
