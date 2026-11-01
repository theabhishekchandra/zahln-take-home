import { useSyncExternalStore } from 'react';

import { useDependencies } from './dependencies';

/** Whether the till can reach Zahln. While offline no QR is shown and nothing is queued. */
export function useOnline(): boolean {
  const { connectivity } = useDependencies();
  return useSyncExternalStore(connectivity.subscribe, connectivity.isOnline);
}
