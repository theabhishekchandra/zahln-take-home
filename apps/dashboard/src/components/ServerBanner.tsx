import { formatCountdown, useFormat, useTranslation } from '@zahln/i18n';
import { Button, Icon } from '@zahln/ui-web';
import { useEffect, useState } from 'react';

import type { Remote } from '@/lib/use-remote';

/** The banner is inverted (ink on surface swapped), and so is its button. */
const RETRY_LOOK = { minHeight: 44, border: 0, background: 'var(--color-surface-raised)', color: 'var(--color-ink)' } as const;

type Status = Pick<Remote<unknown>, 'failed' | 'savedAt' | 'retryAt' | 'retry' | 'loading'>;

/** W9: the server didn't answer. Says how old the numbers are and when it tries again. Goes above the page title. */
export function ServerBanner({ remote }: { readonly remote: Status }) {
  const { t } = useTranslation();
  const format = useFormat();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!remote.failed) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [remote.failed]);
  if (!remote.failed) return null;
  const seconds = remote.retryAt ? Math.max(0, (remote.retryAt - now) / 1000) : 0;
  return (
    <div className="server-banner">
      <span className="server-banner-icon">
        <Icon name="retry" size={22} />
      </span>
      {/* Only the message is live: the ticking countdown would be read out every second. */}
      <div role="alert" className="server-banner-text">
        <strong>{t('dashboard.offline.title')}</strong>
        <p>{remote.savedAt ? t('dashboard.offline.body', { time: format.time(remote.savedAt) }) : t('dashboard.offline.bodyEmpty')}</p>
      </div>
      <span className="server-banner-next">
        <span aria-hidden className="spinner" />
        {t('dashboard.offline.nextTry', { time: formatCountdown(seconds) })}
      </span>
      <Button variant="secondary" style={RETRY_LOOK} onClick={remote.retry} disabled={remote.loading}>
        {t('dashboard.offline.retry')}
      </Button>
    </div>
  );
}

/** W9's footnote, under the page while the server is away: why export is off. */
export function OfflineNote({ failed }: { readonly failed: boolean }) {
  const { t } = useTranslation();
  return failed ? <p className="muted small">{t('dashboard.offline.actionsOff')}</p> : null;
}
