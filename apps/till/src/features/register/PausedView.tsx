import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, Button, Icon, Pill, useTheme } from '@zahln/ui-native';
import { useState } from 'react';
import { View } from 'react-native';

import { HeroBody, ResultHero } from '@/features/sale/ResultHero';
import { PanelActions, SaleLayout } from '@/features/sale/SaleLayout';

/**
 * T14: Zahln's operations switched payments off. No new codes, but refunds and
 * payments already started still work. Goes away by itself when the switch is
 * back on (the gate keeps reading Zahln's config). The order on the ticket is kept.
 */
export function PausedView({ onOpenRefunds }: { readonly onOpenRefunds: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  // Zahln's config doesn't say when the pause began; this is when the till first saw it.
  const [since] = useState(() => new Date());

  const item = (text: string, works: boolean, divider: boolean) => (
    <View
      accessible
      accessibilityLabel={`${works ? t('till.paused.works') : t('till.paused.doesNotWork')}: ${text}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: theme.colors.disabledFill,
      }}>
      <Icon name={works ? 'tick' : 'close'} size={18} strokeWidth={2.6} color={works ? theme.colors.brand : theme.colors.danger} />
      <AppText style={{ flex: 1, fontSize: 15 }}>{text}</AppText>
    </View>
  );

  return (
    <SaleLayout
      ground="surface"
      main={
        <View accessibilityRole="alert" style={{ alignItems: 'center', gap: theme.spacing[4] }}>
          <ResultHero
            icon="pause"
            iconColor={theme.colors.pending}
            iconBackground={theme.colors.pendingTint}
            title={t('till.paused.title')}
            announcement={t('till.paused.title')}>
            <HeroBody>{t('till.paused.body')}</HeroBody>
          </ResultHero>
          <Pill tone="neutral" label={t('till.paused.since', { time: format.time(since) })} />
        </View>
      }
      panel={
        <>
          <AppText variant="titleS" accessibilityRole="header" style={{ fontSize: 18 }}>
            {t('till.paused.worksTitle')}
          </AppText>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 4 }}>
            {item(t('till.paused.refunds'), true, true)}
            {item(t('till.paused.started'), true, true)}
            {item(t('till.paused.newCodes'), false, false)}
          </View>
          <PanelActions>
            <Button size="large" label={t('till.paused.openRefunds')} onPress={onOpenRefunds} />
          </PanelActions>
        </>
      }
    />
  );
}
