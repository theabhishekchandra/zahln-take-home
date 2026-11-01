import { authorizeWithBiometrics, biometricsEnabled, type Authorization } from '@zahln/application';
import { useTranslation } from '@zahln/i18n';
import { useCallback, useEffect, useState } from 'react';

import { useDependencies } from '@/lib/dependencies';

/**
 * Fingerprint first, the app PIN when it can't be used. Shared by paying and
 * signing in again: both need "only the student can do this".
 */
export function useAuthorize() {
  const { biometrics } = useDependencies();
  const { t } = useTranslation();
  const [canUseBiometrics, setCanUseBiometrics] = useState(false);

  useEffect(() => {
    let active = true;
    biometricsEnabled(biometrics).then((enabled) => active && setCanUseBiometrics(enabled));
    return () => {
      active = false;
    };
  }, [biometrics]);

  /** The OS prompt's cancel button reads "Use PIN", so a cancel opens the PIN. */
  const withBiometrics = useCallback(
    (title: string): Promise<Authorization> => authorizeWithBiometrics(biometrics, { title, cancelLabel: t('review.usePin') }),
    [biometrics, t],
  );

  return { canUseBiometrics, withBiometrics } as const;
}
