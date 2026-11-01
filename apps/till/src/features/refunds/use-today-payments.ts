import type { Payment } from '@zahln/domain';
import { useCallback, useEffect, useState } from 'react';

import { useDependencies } from '@/lib/dependencies';

export type TodayPayments =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly payments: readonly Payment[] }
  | { readonly status: 'failed'; readonly sessionExpired: boolean };

/**
 * Today's payments on this till: Zahln lists only the signed-in cashier's
 * till. Reloaded on `reload()` and when the till comes back online.
 */
export function useTodayPayments(online: boolean): readonly [TodayPayments, () => void] {
  const { loadToday } = useDependencies();
  const [state, setState] = useState<TodayPayments>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!online) return;
    let live = true;
    void loadToday().then((result) => {
      if (!live) return;
      if (result.ok) setState({ status: 'ready', payments: result.value });
      else setState({ status: 'failed', sessionExpired: result.error.kind === 'not_processed' && result.error.cause === 'unauthorized' });
    });
    return () => {
      live = false;
    };
  }, [online, version, loadToday]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return [state, reload] as const;
}
