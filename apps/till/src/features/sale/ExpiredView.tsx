import { ticketItemCount, type Order } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { AppText, Button, Icon, useTheme } from '@zahln/ui-native';
import { View } from 'react-native';

import { OrderItems } from './OrderItems';
import { HeroBody, ResultHero } from './ResultHero';
import { PanelActions, SaleLayout } from './SaleLayout';

export interface ExpiredViewProps {
  readonly order: Order;
  readonly busy: boolean;
  readonly onNewCode: () => void;
  readonly onSetAside: () => void;
}

/** How long the order's code worked, in whole minutes. */
const codeMinutes = (order: Order) => Math.round((Date.parse(order.expiresAt) - Date.parse(order.createdAt)) / 60_000);

/**
 * T6: nobody paid with the code in time. Zahln can't renew a code, so a new
 * code rings up the same items as a new order.
 */
export function ExpiredView({ order, busy, onNewCode, onSetAside }: ExpiredViewProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <SaleLayout
      ground="surface"
      main={
        <ResultHero
          icon="clock"
          iconColor={theme.colors.onBrand}
          iconBackground={theme.colors.pending}
          title={t('till.expired.title')}
          announcement={t('till.expired.title')}
          art={<ExpiredCode />}>
          <HeroBody>{t('till.expired.body')}</HeroBody>
        </ResultHero>
      }
      panel={
        <>
          <AppText variant="titleS" accessibilityRole="header">
            {t('till.expired.summary', { id: order.id, count: ticketItemCount(order.items) })}
          </AppText>
          <OrderItems items={order.items} />
          <AppText variant="caption" tone="muted">
            {t('till.expired.note', { minutes: codeMinutes(order) })}
          </AppText>
          <PanelActions>
            <Button size="large" label={t('till.expired.newCode')} onPress={onNewCode} loading={busy} />
            <Button size="large" variant="secondary" label={t('till.qr.setAside')} onPress={onSetAside} disabled={busy} />
          </PanelActions>
        </>
      }
    />
  );
}

/** The code that ran out: a faded QR with an amber clock on its corner. */
function ExpiredCode() {
  const theme = useTheme();
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: 168, height: 168 }}>
      <View
        style={{
          width: 150,
          height: 150,
          borderRadius: 32,
          backgroundColor: theme.colors.surfaceRaised,
          boxShadow: theme.elevation.card,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.55,
        }}>
        <Icon name="qr" size={96} strokeWidth={1.6} color={theme.colors.inkMuted} />
      </View>
      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: theme.colors.pending,
          borderWidth: 4,
          borderColor: theme.colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name="clock" size={32} strokeWidth={2.4} color={theme.colors.onBrand} />
      </View>
    </View>
  );
}
