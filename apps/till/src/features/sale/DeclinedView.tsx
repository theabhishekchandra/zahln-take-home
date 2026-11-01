import type { Order } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { AppText, Button, useTheme } from '@zahln/ui-native';

import { OrderItems } from './OrderItems';
import { HeroBody, ResultHero } from './ResultHero';
import { PanelActions, SaleLayout } from './SaleLayout';

export interface DeclinedViewProps {
  readonly order: Order;
  readonly onShowAgain: () => void;
  readonly onSetAside: () => void;
}

/**
 * T5: Zahln declined it. Nothing was charged and the order stays open, so the
 * same code can be paid again. Zahln gives no reason, so the till names none.
 */
export function DeclinedView({ order, onShowAgain, onSetAside }: DeclinedViewProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <SaleLayout
      ground="surface"
      main={
        <ResultHero
          icon="close"
          iconColor={theme.colors.onBrand}
          iconBackground={theme.colors.danger}
          title={t('till.declined.title')}
          announcement={`${t('till.declined.title')}. ${t('till.declined.nothingCharged')}`}>
          <HeroBody>
            <AppText variant="bodyStrong" style={{ fontSize: 19 }}>
              {t('till.declined.nothingCharged')}
            </AppText>{' '}
            {t('till.declined.body')}
          </HeroBody>
        </ResultHero>
      }
      panel={
        <>
          <AppText variant="titleS" accessibilityRole="header">
            {t('till.declined.stillOpen')}
          </AppText>
          <OrderItems items={order.items} />
          <PanelActions>
            <Button size="large" label={t('till.declined.showAgain')} onPress={onShowAgain} />
            <Button size="large" variant="secondary" label={t('till.qr.setAside')} onPress={onSetAside} />
          </PanelActions>
        </>
      }
    />
  );
}
