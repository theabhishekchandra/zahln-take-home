import type { Order } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { AppText, Button, CountdownRing, QrCode, useCountdown, useTheme, WaitingDots } from '@zahln/ui-native';
import { hero } from '@zahln/ui-tokens';
import { useWindowDimensions, View } from 'react-native';

import { useDependencies } from '@/lib/dependencies';
import type { Shift } from '@/lib/shift';

import { GroupPrices } from './GroupPrices';
import { OrderItems } from './OrderItems';
import { PanelActions, SaleLayout } from './SaleLayout';

export interface QrViewProps {
  readonly shift: Shift;
  readonly order: Order;
  readonly onSetAside: () => void;
}

/** T3: the order's QR while the till waits for Zahln's answer. */
export function QrView({ shift, order, onSetAside }: QrViewProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const { serverNow } = useDependencies();
  // The code's whole life and what's left of it, both on the server's clock.
  const seconds = useCountdown(Date.parse(order.expiresAt), serverNow);
  const totalSeconds = Math.round((Date.parse(order.expiresAt) - Date.parse(order.createdAt)) / 1000);
  const qrSize = Math.max(200, Math.min(380, height - 280));

  return (
    <SaleLayout
      ground="hero"
      main={
        <>
          <AppText variant="titleS" style={{ color: hero.inkMuted, fontSize: 18 }}>
            {t('till.qr.scanWith')}
          </AppText>
          <View style={{ backgroundColor: '#ffffff', padding: 26, borderRadius: 32 }}>
            <QrCode value={order.qrPayload} size={qrSize} accessibilityLabel={t('till.qr.label')} />
          </View>
          <AppText variant="bodyStrong" style={{ color: hero.ink }} selectable>
            {t('till.qr.code', { id: order.id })}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}>
            <WaitingDots color={hero.live} />
            <AppText style={{ color: hero.inkMuted }}>{t('till.qr.waiting')}</AppText>
          </View>
        </>
      }
      panel={
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4] }}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{t('till.header.place', { mensa: shift.login.mensaName, till: shift.login.tillName })}</AppText>
              <AppText variant="caption" tone="muted">
                {t('till.qr.order', { id: order.id })}
              </AppText>
            </View>
            <CountdownRing
              seconds={seconds}
              totalSeconds={totalSeconds}
              accessibilityLabel={t('till.qr.timer', { minutes: Math.floor(seconds / 60), seconds: seconds % 60 })}
            />
          </View>
          <OrderItems items={order.items} />
          <GroupPrices totals={order.amounts} look="tiles" />
          <AppText variant="caption" tone="muted">
            {t('till.qr.note')}
          </AppText>
          <PanelActions>
            <Button size="large" variant="secondary" label={t('till.qr.setAside')} onPress={onSetAside} />
          </PanelActions>
        </>
      }
    />
  );
}
