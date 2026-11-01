import type { RecheckStatus } from '@zahln/application';
import type { CheckingCause, Order } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { AppText, Button, StepTracker, useCountdown, useTheme } from '@zahln/ui-native';
import { View } from 'react-native';

import { HeroBody, ResultHero } from './ResultHero';
import { PanelActions, SaleLayout } from './SaleLayout';

export interface CheckingViewProps {
  readonly order: Order;
  readonly cause: CheckingCause;
  readonly recheck: RecheckStatus;
  readonly onCheckNow: () => void;
}

/**
 * T7: the outcome is not known. The till keeps asking and moves to Paid or
 * Declined by itself; there is no way to cancel or ring the order up again here.
 */
export function CheckingView({ order, cause, recheck, onCheckNow }: CheckingViewProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const seconds = useCountdown(recheck.nextCheckAt);
  const lost = cause === 'connection';
  const title = lost ? t('till.lost.title') : t('till.lost.reviewTitle');
  return (
    <SaleLayout
      ground="surface"
      main={
        <ResultHero
          icon={lost ? 'offline' : 'clock'}
          iconColor={theme.colors.pending}
          iconBackground={theme.colors.pendingTint}
          title={title}
          announcement={lost ? `${title}. ${t('till.lost.banner')}` : title}>
          {lost ? (
            <View style={{ backgroundColor: theme.colors.ink, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 22 }}>
              <AppText variant="titleS" style={{ color: theme.colors.surfaceRaised, fontSize: 22, textAlign: 'center' }}>
                {t('till.lost.banner')}
              </AppText>
            </View>
          ) : null}
          <HeroBody>{lost ? t('till.lost.body') : t('till.lost.reviewBody')}</HeroBody>
        </ResultHero>
      }
      panel={
        <>
          <AppText variant="titleS" accessibilityRole="header">
            {t('till.lost.checking', { id: order.id })}
          </AppText>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, padding: theme.spacing[4] }}>
            <StepTracker
              bare
              activeTone="pending"
              steps={[
                { label: t('till.lost.stepShown'), status: 'done' },
                { label: t('till.lost.stepWaiting'), status: 'active' },
                { label: t('till.lost.stepResult'), status: 'pending' },
              ]}
            />
          </View>
          <AppText variant="caption" tone="muted" accessibilityLiveRegion="polite" style={{ fontVariant: ['tabular-nums'] }}>
            {recheck.checking || !recheck.nextCheckAt ? t('till.lost.checkingNow') : t('till.lost.nextCheck', { seconds })}
            {recheck.checks > 0 ? ` · ${t('till.lost.checked', { count: recheck.checks })}` : ''}
          </AppText>
          <PanelActions>
            <Button size="large" label={t('till.lost.checkNow')} onPress={onCheckNow} loading={recheck.checking} />
          </PanelActions>
        </>
      }
    />
  );
}
