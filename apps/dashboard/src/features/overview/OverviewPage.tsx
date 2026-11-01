import { loadOverview, loadTrend, today, type Overview } from '@zahln/application';
import { addDays, money, weekday, type DailyTotals, type Money, type Totals } from '@zahln/domain';
import { useFormat, useTranslation, type Format } from '@zahln/i18n';
import { BarChart, Button, Pill } from '@zahln/ui-web';
import { Link, useSearchParams } from 'react-router';

import { Kpi, type KpiProps } from '@/components/Kpi';
import { PageHeader } from '@/components/PageHeader';
import { OfflineNote, ServerBanner } from '@/components/ServerBanner';
import { AttentionRow } from '@/features/attention/AttentionRow';
import { useAuth } from '@/lib/auth';
import { useDependencies } from '@/lib/dependencies';
import { dayPart, firstName } from '@/lib/people';
import { attentionBadge, useReportAttention, useReportOffline } from '@/lib/shell-status';
import { useOverlays } from '@/lib/use-overlays';
import { useRemote } from '@/lib/use-remote';

const TREND_DAYS = 14;

/** W2: one day at a glance, against the same weekday a week before. W9 when Zahln doesn't answer. */
export function OverviewPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const { finance, totalsCache } = useDependencies();
  const { user } = useAuth();
  const overlays = useOverlays();
  const [params, setParams] = useSearchParams();
  const yesterday = params.get('day') === 'yesterday';
  const current = today(finance);
  const day = yesterday ? addDays(current, -1) : current;

  const overview = useRemote(() => loadOverview(finance, day), `overview:${day}`);
  const trend = useRemote(() => loadTrend(finance, day, TREND_DAYS, totalsCache), `trend:${day}`);
  const data = overview.data;
  const stale = overview.failed && data !== null;
  const attention = data ? { count: data.attention.length, more: data.moreAttention } : null;
  useReportOffline(overview.failed);
  useReportAttention(attention);
  const name = user ? firstName(user.name) : '';
  const title = name ? t(`dashboard.overview.greeting.${dayPart(finance.clock.now())}`, { name }) : t('dashboard.overview.title');

  const subtitle = !data?.attention.length
    ? t('dashboard.overview.subtitle', { day: format.day(day) })
    : data.moreAttention
      ? t('dashboard.overview.subtitleAttentionMore', { day: format.day(day), count: data.attention.length })
      : t('dashboard.overview.subtitleAttention', { day: format.day(day), count: data.attention.length });

  return (
    <>
      <ServerBanner remote={overview} />
      <PageHeader
        title={title}
        subtitle={
          <>
            {subtitle}{' '}
            {stale && overview.savedAt ? <Pill tone="pending">{t('dashboard.offline.saved', { time: format.time(overview.savedAt) })}</Pill> : null}
          </>
        }
        actions={
          <>
            <div role="group" aria-label={t('dashboard.overview.day')} className="segmented">
              <button type="button" aria-pressed={!yesterday} onClick={() => setParams({})}>
                {t('dashboard.overview.today')}
              </button>
              <button type="button" aria-pressed={yesterday} onClick={() => setParams({ day: 'yesterday' })}>
                {t('dashboard.overview.yesterday')}
              </button>
            </div>
            <Button icon="download" onClick={overlays.openExport} disabled={overview.failed}>
              {overview.failed ? t('dashboard.offline.exportNeedsConnection') : t('dashboard.nav.export')}
            </Button>
          </>
        }
      />
      {data ? (
        <div className={stale ? 'stale' : undefined}>
          <Kpis overview={data} format={format} />
          <div className="row">
            <section className="card grow-3" aria-labelledby="trend">
              <div className="card-head">
                <h2 id="trend">{t('dashboard.overview.trend.title')}</h2>
                <span className="muted small">{t('dashboard.overview.trend.note')}</span>
              </div>
              {trend.data ? (
                <Trend days={trend.data} format={format} />
              ) : (
                <p className="muted">{trend.failed ? t('dashboard.overview.trend.failed') : t('dashboard.overview.trend.loading')}</p>
              )}
            </section>
            <section className="card grow-2" aria-labelledby="per-mensa">
              <h2 id="per-mensa">{t('dashboard.overview.perMensa')}</h2>
              <MensaBars totals={data.totals} format={format} />
            </section>
          </div>
          <div className="row">
            <section className="card grow-1" aria-labelledby="attention">
              <div className="card-head">
                <h2 id="attention">{t('dashboard.overview.attention')}</h2>
                <Link to="/attention" className="see-all">
                  {attention && attention.count > 0 ? t('dashboard.overview.seeAllCount', { n: attentionBadge(attention) }) : t('dashboard.overview.seeAll')} ›
                </Link>
              </div>
              {data.attention.length === 0 ? (
                <p className="muted">{t('dashboard.overview.none')}</p>
              ) : (
                <ul className="plain-list attention-rows">
                  {data.attention.map((payment) => (
                    <AttentionRow key={payment.id} payment={payment} onOpen={() => overlays.openPayment(payment.id)} />
                  ))}
                </ul>
              )}
            </section>
            <section className="card grow-1" aria-labelledby="per-till">
              <h2 id="per-till">{t('dashboard.overview.perTill')}</h2>
              <TillTable totals={data.totals} format={format} />
            </section>
          </div>
        </div>
      ) : overview.loading ? (
        <p className="muted">{t('dashboard.loading')}</p>
      ) : null}
      <OfflineNote failed={overview.failed} />
    </>
  );
}

function change(now: number, before: number | undefined) {
  if (before === undefined || before === 0) return null;
  return (now - before) / before;
}

const average = (t: Totals): Money => money(t.paymentCount === 0 ? 0 : Math.round(t.gross.cents / t.paymentCount));

function Kpis({ overview, format }: { readonly overview: Overview; readonly format: Format }) {
  const { t } = useTranslation();
  const { totals, weekBefore } = overview;
  const vsDay = weekBefore ? format.day(weekBefore.date) : '';
  const delta = (now: number, before: number | undefined, neutral = false): KpiProps['change'] => {
    const ratio = change(now, before);
    if (ratio === null) return undefined;
    const text = format.change(ratio);
    return { text, spoken: t('dashboard.overview.kpi.changeSpoken', { change: text, day: vsDay }), direction: ratio > 0 ? 'up' : ratio < 0 ? 'down' : 'flat', neutral };
  };
  const vs = weekBefore ? t('dashboard.overview.kpi.vs', { day: vsDay }) : t('dashboard.overview.kpi.noCompare');
  return (
    <div className="kpis">
      <Kpi label={t('dashboard.overview.kpi.net')} value={format.money(totals.net)} change={delta(totals.net.cents, weekBefore?.net.cents)} note={vs} />
      <Kpi label={t('dashboard.overview.kpi.payments')} value={format.count(totals.paymentCount)} change={delta(totals.paymentCount, weekBefore?.paymentCount)} note={vs} />
      <Kpi
        label={t('dashboard.overview.kpi.average')}
        value={format.money(average(totals))}
        change={delta(average(totals).cents, weekBefore ? average(weekBefore).cents : undefined)}
        note={vs}
      />
      {/* Fewer refunds isn't bad news, so its change carries no colour. */}
      <Kpi label={t('dashboard.overview.kpi.refunds')} value={format.money(totals.refunded)} change={delta(totals.refunded.cents, weekBefore?.refunded.cents, true)} note={vs} />
      <Kpi
        label={t('dashboard.overview.kpi.pending')}
        value={format.money(totals.pending)}
        note={t('dashboard.overview.kpi.pendingNote', { count: totals.pendingCount })}
      />
    </div>
  );
}

function Trend({ days, format }: { readonly days: readonly DailyTotals[]; readonly format: Format }) {
  const { t } = useTranslation();
  const values = days.map((d) => d.net.cents);
  const last = days.length - 1;
  return (
    <BarChart
      label={t('dashboard.overview.trend.label', { min: format.money(money(Math.min(...values))), max: format.money(money(Math.max(...values))) })}
      bars={days.map((d, i) => ({
        key: d.date,
        value: Math.max(0, d.net.cents),
        label: i % 3 === last % 3 ? format.dayShort(d.date) : undefined,
        tone: i === last ? 'highlight' : weekday(d.date) === 0 || weekday(d.date) === 6 ? 'muted' : 'brand',
      }))}
    />
  );
}

function MensaBars({ totals, format }: { readonly totals: DailyTotals; readonly format: Format }) {
  const max = Math.max(1, ...totals.mensas.map((m) => m.net.cents));
  const mensas = [...totals.mensas].sort((a, b) => b.net.cents - a.net.cents);
  return (
    <ul className="plain-list mensa-bars">
      {mensas.map((m) => (
        <li key={m.mensa.id}>
          <div className="mensa-bar-head">
            <span>{m.mensa.name}</span>
            <strong className="num">{format.money(m.net)}</strong>
          </div>
          <div className="meter" aria-hidden>
            <div style={{ width: `${(Math.max(0, m.net.cents) / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TillTable({ totals, format }: { readonly totals: DailyTotals; readonly format: Format }) {
  const { t } = useTranslation();
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">{t('dashboard.overview.till')}</th>
            <th scope="col" className="num">
              {t('dashboard.overview.payments')}
            </th>
            <th scope="col" className="num">
              {t('dashboard.overview.net')}
            </th>
            <th scope="col" className="num">
              {t('dashboard.overview.pending')}
            </th>
          </tr>
        </thead>
        <tbody>
          {totals.mensas.flatMap((m) =>
            m.tills.map((till) => (
              <tr key={till.till.id}>
                <td>{`${m.mensa.name} · ${till.till.name}`}</td>
                <td className="num">{format.count(till.paymentCount)}</td>
                <td className="num">{format.money(till.net)}</td>
                <td className={till.pendingCount > 0 ? 'num pending-text' : 'num'}>{format.count(till.pendingCount)}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
