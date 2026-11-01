import type { Payment } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { Icon } from '@zahln/ui-web';

import { mainReason, reasonLook } from '@/lib/attention';

import { ReasonTile } from './ReasonTile';

/** One flagged payment in the overview's short list; opens its drawer. */
export function AttentionRow({ payment, onOpen }: { readonly payment: Payment; readonly onOpen: () => void }) {
  const { t } = useTranslation();
  const format = useFormat();
  const reason = mainReason(payment);
  return (
    <li>
      <button type="button" className="attention-row" onClick={onOpen}>
        <ReasonTile look={reasonLook(reason)} />
        <span className="attention-row-text">
          <span className="attention-title">{t(`dashboard.attention.reason.${reason}.title`)}</span>
          <span className="muted">
            {[payment.mensa.name, payment.till.name, format.money(payment.amount), t('dashboard.attention.since', { time: format.berlinDateTime(payment.createdAt) })].join(' · ')}
          </span>
        </span>
        <span className="chevron">
          <Icon name="chevron" />
        </span>
      </button>
    </li>
  );
}
