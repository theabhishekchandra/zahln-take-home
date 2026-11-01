import { loadAttention } from '@zahln/application';
import { useFormat, useTranslation } from '@zahln/i18n';
import { Button, Pill } from '@zahln/ui-web';

import { PageHeader } from '@/components/PageHeader';
import { OfflineNote, ServerBanner } from '@/components/ServerBanner';
import { mainReason, reasonLook } from '@/lib/attention';
import { useDependencies } from '@/lib/dependencies';
import { useReportAttention, useReportOffline } from '@/lib/shell-status';
import { useOverlays } from '@/lib/use-overlays';
import { usePaged } from '@/lib/use-remote';

import { ReasonTile } from './ReasonTile';

const OPEN_LOOK = { minHeight: 44, border: 0, background: 'var(--color-pressed)', fontSize: 14 } as const;

/**
 * W3: payments Zahln flags for a look. Zahln decides what's flagged and when
 * it stops; its API can't mark one resolved, so this page has no such button.
 */
export function AttentionPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const { finance } = useDependencies();
  const overlays = useOverlays();
  const list = usePaged((cursor) => loadAttention(finance, cursor), 'attention');
  const settled = !list.loading && !list.failed;
  useReportOffline(list.failed);
  useReportAttention(settled ? { count: list.items.length, more: list.hasMore } : null);

  return (
    <>
      <ServerBanner remote={list} />
      <PageHeader title={t('dashboard.attention.title')} subtitle={t('dashboard.attention.subtitle')} />
      {settled && list.items.length === 0 ? <p className="card">{t('dashboard.attention.none')}</p> : null}
      <ul className={list.failed && list.items.length > 0 ? 'plain-list attention-cards stale' : 'plain-list attention-cards'}>
        {list.items.map((payment) => {
          const reason = mainReason(payment);
          const look = reasonLook(reason);
          return (
            <li key={payment.id} className="card attention-card">
              <ReasonTile look={look} size="large" />
              <div className="attention-card-text">
                <div className="attention-card-head">
                  <h2 id={`flag-${payment.id}`}>{t(`dashboard.attention.reason.${reason}.title`)}</h2>
                  <Pill tone={look.tone} dot={false}>
                    {look.severity === 'high' ? t('dashboard.attention.high') : t('dashboard.attention.medium')}
                  </Pill>
                  <span className="muted small">{t('dashboard.attention.since', { time: format.berlinDateTime(payment.createdAt) })}</span>
                </div>
                <p>{t(`dashboard.attention.reason.${reason}.body`)}</p>
                <p className="muted small mono">{[payment.id, payment.mensa.name, payment.till.name, format.money(payment.amount)].join(' · ')}</p>
              </div>
              <Button variant="secondary" style={OPEN_LOOK} aria-describedby={`flag-${payment.id}`} onClick={() => overlays.openPayment(payment.id)}>
                {t('dashboard.attention.open')}
              </Button>
            </li>
          );
        })}
      </ul>
      {list.loading ? <p className="muted">{t('dashboard.loading')}</p> : null}
      {list.hasMore && !list.loading && !list.failed ? (
        <Button variant="secondary" onClick={list.loadMore}>
          {t('dashboard.attention.more')}
        </Button>
      ) : null}
      <OfflineNote failed={list.failed} />
      <p className="muted small">{t('dashboard.attention.note')}</p>
    </>
  );
}
