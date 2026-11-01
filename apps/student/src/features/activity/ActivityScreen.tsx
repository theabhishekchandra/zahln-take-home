import { addDays, businessDay, money, paymentStanding, type Payment } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, Button, Card, ChipGroup, IconButton, MiniBars, NoticeCard, Screen, SearchField, useTheme } from '@zahln/ui-native';
import { useState } from 'react';
import { Share, View } from 'react-native';

import { useMonthSummary } from '@/features/home/use-month-summary';
import { openReceipt } from '@/lib/routes';
import { useOnline } from '@/lib/use-online';

import { PaymentRow } from './PaymentRow';
import { matchesSearch, statementText } from './statement';
import { usePaymentPages } from './use-payment-pages';

type Filter = 'all' | 'checking' | 'refunds';

const matches: Readonly<Record<Filter, (payment: Payment) => boolean>> = {
  all: () => true,
  checking: (p) => paymentStanding(p) === 'checking',
  refunds: (p) => p.refunded.cents > 0 || p.refundPending.cents > 0,
};

/**
 * Screens 15 and 16: this month with its weeks, then payments by day, searched
 * and filtered, each opening its receipt. Search covers the payments loaded so
 * far: Zahln's API only searches by ID.
 */
export function ActivityScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const online = useOnline();
  const summary = useMonthSummary(1);
  const list = usePaymentPages();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const now = new Date();
  const today = businessDay(now);

  const shown = list.items.filter((payment) => matches[filter](payment) && matchesSearch(payment, query, format));
  const checkingCount = list.items.filter(matches.checking).length;
  const days = groupByDay(shown);
  const dayTitle = (day: string) =>
    day === today ? t('activity.today') : day === addDays(today, -1) ? t('activity.yesterday') : format.day(day);

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="titleL" accessibilityRole="header">
          {t('tabs.activity')}
        </AppText>
        {summary && summary.payments.length > 0 ? (
          <IconButton
            icon="download"
            accessibilityLabel={t('activity.statement')}
            onPress={() =>
              void Share.share({
                title: t('activity.statementTitle', { month: format.month(summary.month) }),
                message: statementText(summary.month, summary.payments, summary.spent, t, format),
              })
            }
          />
        ) : null}
      </View>
      <SearchField label={t('activity.searchLabel')} placeholder={t('activity.search')} value={query} onChangeText={setQuery} />
      {online ? null : <NoticeCard tone="problem" title={t('offline.banner')} />}
      {summary ? (
        <Card style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingVertical: theme.spacing[4], paddingHorizontal: 18 }}>
          <View>
            <AppText variant="label" tone="muted" style={{ fontSize: 12 }}>
              {t('activity.soFar', { month: format.month(summary.month) })}
            </AppText>
            <AppText variant="titleL" style={{ fontVariant: ['tabular-nums'] }}>
              {format.money(summary.spent)}
            </AppText>
            <AppText variant="caption" tone="muted">
              {`${t('home.payments', { count: summary.confirmedCount })} · ${t('activity.fees', { amount: format.money(money(0)) })}`}
            </AppText>
          </View>
          <MiniBars
            values={summary.weekly.map((week) => week.cents)}
            accessibilityLabel={t('activity.weeks', { amounts: summary.weekly.map((week) => format.money(week)).join(', ') })}
          />
        </Card>
      ) : null}
      <ChipGroup
        role="tablist"
        accessibilityLabel={t('activity.filters')}
        selected={filter}
        onSelect={setFilter}
        options={(['all', 'checking', 'refunds'] as const).map((value) => ({
          value,
          label: value === 'checking' && checkingCount > 0 ? `${t('activity.filter.checking')} · ${checkingCount}` : t(`activity.filter.${value}`),
        }))}
      />
      {list.failed && online ? (
        <View style={{ gap: theme.spacing[2] }}>
          <NoticeCard tone="problem" title={t('activity.failed')} />
          <Button variant="secondary" label={t('activity.retry')} onPress={list.retry} />
        </View>
      ) : null}
      {!list.loading && list.items.length === 0 && !list.failed ? (
        <Card style={{ padding: theme.spacing[5] }}>
          <AppText tone="muted">{t('home.empty')}</AppText>
        </Card>
      ) : list.items.length > 0 && shown.length === 0 ? (
        <AppText tone="muted">{t('activity.noneInFilter')}</AppText>
      ) : null}
      {days.map(([day, payments]) => (
        <View key={day} style={{ gap: theme.spacing[2] }}>
          <AppText variant="label" tone="secondary" accessibilityRole="header">
            {dayTitle(day)}
          </AppText>
          <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
            {payments.map((payment, index) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                mensaName={payment.mensa.name}
                now={now}
                onPress={() => openReceipt(payment.id)}
                divider={index < payments.length - 1}
              />
            ))}
          </Card>
        </View>
      ))}
      {list.hasMore && online ? (
        <Button variant="text" label={t('activity.more')} disabled={list.loading} onPress={list.loadMore} />
      ) : null}
    </Screen>
  );
}

/** Newest day first; a day is the mensa's day (Berlin), the same as on the till and in the books. */
function groupByDay(payments: readonly Payment[]): (readonly [string, readonly Payment[]])[] {
  const days = new Map<string, Payment[]>();
  for (const payment of payments) {
    const day = businessDay(new Date(payment.createdAt));
    days.set(day, [...(days.get(day) ?? []), payment]);
  }
  return [...days.entries()];
}
