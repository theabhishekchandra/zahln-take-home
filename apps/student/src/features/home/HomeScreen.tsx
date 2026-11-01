import { money } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, Avatar, Card, initials, NoticeCard, Pill, Screen, useExternalStore, useTheme } from '@zahln/ui-native';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { PaymentRow } from '@/features/activity/PaymentRow';
import { useDependencies } from '@/lib/dependencies';
import { useOnline } from '@/lib/use-online';
import { useSignedInUser } from '@/lib/account';
import { openReceipt } from '@/lib/routes';

import { greetingFor } from './greeting';
import { ScanCard } from './ScanCard';
import { StatCard } from './StatCard';
import { useMonthSummary } from './use-month-summary';

/** Design screens 02 (home) and 23 (offline). */
export function HomeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const user = useSignedInUser();
  const { payFlow, gate: gateWatcher } = useDependencies();
  const { gate } = useExternalStore(gateWatcher);
  const { state } = useExternalStore(payFlow);
  const online = useOnline();
  const summary = useMonthSummary();
  const now = new Date();

  // A payment this app is still checking comes first; then any the server is still deciding.
  const serverChecking = summary?.checking[0];
  const checking =
    state.step === 'verifying'
      ? { mensa: state.intent.quote.mensa.name, amount: state.intent.quote.total, open: () => router.push('/pay') }
      : serverChecking
        ? { mensa: serverChecking.mensa.name, amount: serverChecking.amount, open: () => openReceipt(serverChecking.id) }
        : null;

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('home.profile')} onPress={() => router.navigate('/profile')} hitSlop={4}>
          <Avatar initials={initials(user.name)} shape="circle" size={48} selected />
        </Pressable>
        <View style={{ flex: 1 }} accessible accessibilityRole="header">
          <AppText variant="label" tone="muted" style={{ fontSize: 13 }}>
            {t(`home.greeting.${greetingFor(now)}`)}
          </AppText>
          <AppText variant="titleS">{user.name}</AppText>
        </View>
        <Pill label={t(`priceChip.${user.priceGroup}`)} tone={user.priceGroup === 'staff' ? 'staff' : 'brand'} />
      </View>

      {online ? null : <NoticeCard tone="problem" title={t('offline.banner')} />}
      {gate.status === 'payments_disabled' ? <NoticeCard tone="pending" title={t('gate.paymentsDisabled')} body={t('gate.pausedBody')} /> : null}
      {gate.status === 'update_required' ? <NoticeCard tone="problem" title={t('gate.updateRequired')} body={t('gate.updateBody')} /> : null}

      <ScanCard off={!online ? 'offline' : gate.status === 'ok' ? null : gate.status} onPress={() => router.push('/pay')} />

      <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
        <StatCard
          label={t('home.spentIn', { month: format.month(summary?.month ?? now) })}
          value={summary ? format.money(summary.spent) : '–'}
          spokenValue={summary ? format.moneySpoken(summary.spent) : undefined}
          note={summary ? t('home.payments', { count: summary.confirmedCount }) : ''}
        />
        <StatCard label={t('home.feesPaid')} value={format.money(money(0))} spokenValue={format.moneySpoken(money(0))} note={t('home.alwaysZero')} tone="brand" />
      </View>

      {checking ? (
        <NoticeCard
          tone="pending"
          title={t('home.checkingTitle')}
          body={t('home.checkingBody', { mensa: checking.mensa, amount: format.money(checking.amount) })}
          onPress={checking.open}
        />
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="titleS" accessibilityRole="header" style={{ fontSize: 17 }}>
          {t('home.recent')}
        </AppText>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.navigate('/activity')}
          style={{ minHeight: theme.size.tapMin, justifyContent: 'center' }}>
          <AppText variant="bodyStrong" tone="brand">
            {t('home.seeAll')}
          </AppText>
        </Pressable>
      </View>

      <Card style={{ paddingVertical: 2, paddingHorizontal: 14, marginTop: -8 }}>
        {summary && summary.recent.length === 0 ? (
          <AppText tone="muted" style={{ paddingVertical: theme.spacing[4] }}>
            {t('home.empty')}
          </AppText>
        ) : (
          summary?.recent.map((payment, index) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              mensaName={payment.mensa.name}
              now={now}
              onPress={() => openReceipt(payment.id)}
              divider={index < summary.recent.length - 1}
            />
          ))
        )}
      </Card>

      {!online && summary ? (
        <AppText variant="caption" tone="muted">
          {t('offline.note', { time: format.time(summary.loadedAt) })}
        </AppText>
      ) : null}
    </Screen>
  );
}
