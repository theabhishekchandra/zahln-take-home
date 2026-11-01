import { formatCountdown, useTranslation } from '@zahln/i18n';
import { announce, Pill, useCountdown } from '@zahln/ui-native';
import { useEffect, useRef } from 'react';

import { useDependencies } from '@/lib/dependencies';

const WARN_AT_SECONDS = 30;

/**
 * How long the till's code stays valid. Read on focus, announced once at 0:30,
 * and at 0:00 the review ends: the app never pays on its own.
 */
export function ReviewTimer({ expiresAt, onExpired }: { readonly expiresAt: string; readonly onExpired: () => void }) {
  const { t } = useTranslation();
  const { serverNow } = useDependencies();
  const seconds = useCountdown(Date.parse(expiresAt), serverNow);
  const warned = useRef(false);

  useEffect(() => {
    if (seconds <= WARN_AT_SECONDS && seconds > 0 && !warned.current) {
      warned.current = true;
      announce(t('review.expiresSoon'));
    }
    if (seconds === 0) onExpired();
  }, [seconds, onExpired, t]);

  return (
    <Pill
      tone="neutral"
      accessibilityRole="timer"
      label={formatCountdown(seconds)}
      accessibilityLabel={t('review.timer', { minutes: Math.floor(seconds / 60), seconds: seconds % 60 })}
    />
  );
}
