import { useSyncExternalStore } from 'react';

import { useDependencies } from './dependencies';

/** Whether paying is possible right now. Nothing is queued while offline. */
export function useOnline(): boolean {
  const { connectivity } = useDependencies();
  return useSyncExternalStore(connectivity.subscribe, connectivity.isOnline);
}
