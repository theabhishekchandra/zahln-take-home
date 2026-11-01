import { loadTransactions, today, type TransactionFilter } from '@zahln/application';
import { asMensaId, type PaymentStatus } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { Button, Icon, Pill } from '@zahln/ui-web';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

import { PageHeader } from '@/components/PageHeader';
import { OfflineNote, ServerBanner } from '@/components/ServerBanner';
import { useDependencies } from '@/lib/dependencies';
import { paymentLabel } from '@/lib/payment-status';
import { useReportOffline } from '@/lib/shell-status';
import { useOverlays } from '@/lib/use-overlays';
import { usePaged, useRemote } from '@/lib/use-remote';

const STATUSES: readonly PaymentStatus[] = ['confirmed', 'pending', 'declined'];
const STATUS_LABEL = { confirmed: 'paid', pending: 'unknown', declined: 'declined' } as const;
const COLUMNS = 7;
/** Placeholder rows while the first page loads, about one screen's worth. */
const SKELETON_ROWS = 8;

/** W4: one day's payments, filtered on the server, newest first. Filters live in the URL. */
export function TransactionsPage() {
  const { t } = useTranslation();
  const format = useFormat();
  const { finance, mensas } = useDependencies();
  const overlays = useOverlays();
  const [params, setParams] = useSearchParams();
  const filter: TransactionFilter = {
    day: params.get('day') ?? today(finance),
    status: (STATUSES as readonly string[]).includes(params.get('status') ?? '') ? (params.get('status') as PaymentStatus) : undefined,
    mensaId: params.get('mensa') ? asMensaId(params.get('mensa')!) : undefined,
    search: params.get('q') ?? undefined,
  };
  const [search, setSearch] = useState(filter.search ?? '');
  const mensaList = useRemote(() => mensas.list(), 'mensas');
  const list = usePaged((cursor) => loadTransactions(finance, filter, cursor), JSON.stringify(filter));
  useReportOffline(list.failed);

  const setFilter = (name: string, value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value);
      else next.delete(name);
      return next;
    });

  // Searches once typing pauses, so each keystroke isn't a request.
  useEffect(() => {
    if (search === (filter.search ?? '')) return;
    const id = setTimeout(() => setFilter('q', search.trim()), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <>
      <ServerBanner remote={list} />
      <PageHeader
        title={t('dashboard.transactions.title')}
        subtitle={t('dashboard.transactions.subtitle', { day: format.day(filter.day), count: list.items.length })}
        actions={
          <Button icon="download" onClick={overlays.openExport} disabled={list.failed}>
            {list.failed ? t('dashboard.offline.exportNeedsConnection') : t('dashboard.nav.export')}
          </Button>
        }
      />
      <div className="filters" role="search">
        <label className="field inline search-field">
          <span className="visually-hidden">{t('dashboard.transactions.search')}</span>
          <Icon name="search" />
          <input type="search" value={search} placeholder={t('dashboard.transactions.searchPlaceholder')} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="field inline">
          <span className="visually-hidden">{t('dashboard.transactions.day')}</span>
          <input type="date" value={filter.day} max={today(finance)} onChange={(e) => setFilter('day', e.target.value)} />
        </label>
        <label className="field inline">
          <span className="visually-hidden">{t('dashboard.transactions.status')}</span>
          <select value={filter.status ?? ''} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">{t('dashboard.transactions.allStatuses')}</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`dashboard.status.${STATUS_LABEL[status]}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="field inline">
          <span className="visually-hidden">{t('dashboard.transactions.mensa')}</span>
          <select value={filter.mensaId ?? ''} onChange={(e) => setFilter('mensa', e.target.value)}>
            <option value="">{t('dashboard.transactions.allMensas')}</option>
            {(mensaList.data ?? []).map((mensa) => (
              <option key={mensa.id} value={mensa.id}>
                {mensa.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={list.failed && list.items.length > 0 ? 'card table-scroll stale' : 'card table-scroll'}>
        <table aria-busy={list.loading}>
          <thead>
            <tr>
              <th scope="col">{t('dashboard.transactions.time')}</th>
              <th scope="col">{t('dashboard.transactions.payment')}</th>
              <th scope="col">{t('dashboard.transactions.place')}</th>
              <th scope="col">{t('dashboard.transactions.group')}</th>
              <th scope="col" className="num">
                {t('dashboard.transactions.amount')}
              </th>
              <th scope="col" className="num">
                {t('dashboard.transactions.refunded')}
              </th>
              <th scope="col">{t('dashboard.transactions.status')}</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((payment) => {
              const status = paymentLabel(payment);
              return (
                <tr key={payment.id}>
                  <td className="num">{format.berlinTime(payment.createdAt)}</td>
                  <td>
                    <button type="button" className="link-button mono" onClick={() => overlays.openPayment(payment.id)}>
                      {payment.id}
                    </button>
                  </td>
                  <td>{`${payment.mensa.name} · ${payment.till.name}`}</td>
                  <td>{t(`priceGroup.${payment.priceGroup}`)}</td>
                  <td className="num">{format.money(payment.amount)}</td>
                  <td className="num">{payment.refunded.cents > 0 ? format.debit(payment.refunded) : '—'}</td>
                  <td>
                    <Pill tone={status.tone}>{t(`dashboard.status.${status.label}`)}</Pill>
                  </td>
                </tr>
              );
            })}
            {list.loading ? <SkeletonRows count={list.items.length === 0 ? SKELETON_ROWS : 2} /> : null}
          </tbody>
        </table>
        {!list.loading && !list.failed && list.items.length === 0 ? <p className="muted">{t('dashboard.transactions.none')}</p> : null}
      </div>
      {list.hasMore && !list.loading && !list.failed ? (
        <Button variant="secondary" onClick={list.loadMore}>
          {t('dashboard.transactions.more')}
        </Button>
      ) : null}
      <OfflineNote failed={list.failed} />
    </>
  );
}

/** Grey bars where rows will be, so the table keeps its shape while a page loads. Read out once as "Loading…". */
function SkeletonRows({ count }: { readonly count: number }) {
  const { t } = useTranslation();
  return (
    <>
      {Array.from({ length: count }, (_, row) => (
        <tr key={row} className="skeleton-row">
          {Array.from({ length: COLUMNS }, (_, cell) => (
            <td key={cell}>{row === 0 && cell === 0 ? <span className="visually-hidden">{t('dashboard.loading')}</span> : null}<span aria-hidden className="skeleton" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}
