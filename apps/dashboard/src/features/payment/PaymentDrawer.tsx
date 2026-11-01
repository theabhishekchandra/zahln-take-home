import { REFUND_REASONS, type PaymentDetail, type PaymentId, type RefundReason } from '@zahln/domain';
import { useFormat, useTranslation, type Format } from '@zahln/i18n';
import { Button, Dialog, Icon, IconButton, Pill } from '@zahln/ui-web';
import { useState } from 'react';

import { reasonLook, reasonsInOrder } from '@/lib/attention';
import { useDependencies } from '@/lib/dependencies';
import { paymentLabel } from '@/lib/payment-status';
import { useRemote } from '@/lib/use-remote';

/** W5: one payment as Zahln has it now, with every event in order. Opened from any page. */
export function PaymentDrawer({ paymentId, onClose }: { readonly paymentId: PaymentId | null; readonly onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Dialog open={paymentId !== null} onClose={onClose} label={t('dashboard.drawer.label', { id: paymentId ?? '' })} placement="right" maxWidth={520}>
      {paymentId ? <Detail paymentId={paymentId} onClose={onClose} /> : null}
    </Dialog>
  );
}

function Detail({ paymentId, onClose }: { readonly paymentId: PaymentId; readonly onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormat();
  const { finance } = useDependencies();
  const detail = useRemote(() => finance.payments.get(paymentId), `payment:${paymentId}`);
  const [copied, setCopied] = useState<'id' | 'timeline' | null>(null);
  const copy = (what: 'id' | 'timeline', text: string) => void navigator.clipboard.writeText(text).then(() => setCopied(what));
  const payment = detail.data;

  return (
    <div className="drawer">
      <div className="drawer-top">
        <span className="mono muted">{paymentId}</span>
        <div className="drawer-actions">
          <IconButton icon={copied === 'id' ? 'check' : 'copy'} label={t('dashboard.drawer.copyId')} onClick={() => copy('id', paymentId)} />
          <IconButton icon="close" label={t('dashboard.drawer.close')} onClick={onClose} />
        </div>
      </div>
      <span role="status" className="visually-hidden">
        {copied ? t('dashboard.drawer.copied') : ''}
      </span>
      {payment ? (
        <PaymentBody payment={payment} format={format} onCopyTimeline={(text) => copy('timeline', text)} copied={copied === 'timeline'} />
      ) : detail.failed ? (
        <p role="alert" className="notice danger">
          {t('dashboard.drawer.failed')}{' '}
          <button type="button" className="link-button" onClick={detail.retry}>
            {t('dashboard.offline.retry')}
          </button>
        </p>
      ) : (
        <p className="muted">{t('dashboard.loading')}</p>
      )}
    </div>
  );
}

const isRefundReason = (reason: string): reason is RefundReason => (REFUND_REASONS as readonly string[]).includes(reason);

function PaymentBody({ payment, format, onCopyTimeline, copied }: { readonly payment: PaymentDetail; readonly format: Format; readonly onCopyTimeline: (text: string) => void; readonly copied: boolean }) {
  const { t } = useTranslation();
  const status = paymentLabel(payment);
  const flags = reasonsInOrder(payment);
  // The till sends one of its fixed reasons; anything else is the server's free text, shown as it is.
  const refundReason = (refundId: string | null) => {
    const reason = payment.refunds.find((refund) => refund.id === refundId)?.reason;
    if (!reason) return null;
    return t('dashboard.drawer.refundReason', { reason: isRefundReason(reason) ? t(`till.refunds.reasons.${reason}`) : reason });
  };
  const events = payment.history.map((event) => ({
    key: `${event.at}-${event.type}-${event.refundId ?? ''}`,
    title: t(`dashboard.drawer.event.${event.type}`),
    at: format.berlinTime(event.at, true),
    amount: event.amount ? format.money(event.amount) : null,
    note: event.type.startsWith('refund_') ? refundReason(event.refundId) : null,
    tone: event.type.endsWith('failed') || event.type.endsWith('declined') ? 'danger' : event.type.endsWith('completed') || event.type.endsWith('confirmed') ? 'success' : 'brand',
  }));
  const timeline = events.map((e) => [e.at, e.title, e.amount, e.note].filter(Boolean).join(' · ')).join('\n');
  return (
    <>
      <div className="drawer-heading">
        <span aria-hidden className="mensa-tile">
          <Icon name="mensa" size={26} strokeWidth={1.8} />
        </span>
        <div>
          <h2>{`${payment.mensa.name} · ${payment.till.name}`}</h2>
          <p className="muted small">{format.berlinDateTime(payment.createdAt)}</p>
        </div>
      </div>
      <div className="drawer-amount">
        <span className="amount">{format.money(payment.amount)}</span>
        <Pill tone={status.tone}>{t(`dashboard.status.${status.label}`)}</Pill>
        {flags.map((reason) => (
          <Pill key={reason} tone={reasonLook(reason).tone} dot={false}>
            {t(`dashboard.attention.reason.${reason}.title`)}
          </Pill>
        ))}
      </div>
      {flags.length > 0 ? (
        <section aria-labelledby="flagged" className={`flag-note ${reasonLook(flags[0]!).tone}`}>
          <h3 id="flagged">{t('dashboard.drawer.flagged')}</h3>
          {flags.map((reason) => (
            <p key={reason}>{t(`dashboard.attention.reason.${reason}.body`)}</p>
          ))}
        </section>
      ) : null}
      <dl className="kv">
        <dt>{t('dashboard.drawer.priceGroup')}</dt>
        <dd>{t(`priceGroup.${payment.priceGroup}`)}</dd>
        <dt>{t('dashboard.drawer.payer')}</dt>
        <dd className="mono">{payment.payer.id}</dd>
        <dt>{t('dashboard.drawer.order')}</dt>
        <dd className="mono">{payment.orderId}</dd>
        <dt>{t('dashboard.transactions.refunded')}</dt>
        <dd>{payment.refunded.cents > 0 ? format.debit(payment.refunded) : '—'}</dd>
        <dt>{t('dashboard.drawer.refundable')}</dt>
        <dd>{format.money(payment.refundable)}</dd>
      </dl>
      <section aria-labelledby="items">
        <h3 id="items">{t('dashboard.drawer.items')}</h3>
        <ul className="plain-list">
          {payment.items.map((item) => (
            <li key={item.itemId} className="line">
              <span>{`${item.quantity}× ${format.text(item.name)}`}</span>
              <span className="num">{format.money({ ...item.unitPrice, cents: item.unitPrice.cents * item.quantity })}</span>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="history">
        <h3 id="history">{t('dashboard.drawer.history')}</h3>
        <ol className="timeline">
          {events.map((e) => (
            <li key={e.key} className={e.tone}>
              <span aria-hidden className="timeline-mark">
                <span className="timeline-dot" />
                <span className="timeline-rail" />
              </span>
              <span className="timeline-text">
                <strong>{e.title}</strong>
                <span className="small">
                  <span className="mono muted">{e.at}</span>
                  {e.amount ? <span className="muted">{` · ${e.amount}`}</span> : null}
                  {e.note ? <span className="muted">{` · ${e.note}`}</span> : null}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <div className="drawer-footer">
        <Button variant="secondary" icon={copied ? 'check' : 'copy'} style={{ width: '100%', border: 0, background: 'var(--color-pressed)' }} onClick={() => onCopyTimeline(timeline)}>
          {copied ? t('dashboard.drawer.copied') : t('dashboard.drawer.copyTimeline')}
        </Button>
      </div>
    </>
  );
}
