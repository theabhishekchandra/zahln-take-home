import { useSyncExternalStore } from 'react';

export interface ExternalStore<T> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): T;
}

/** Renders from a store in the application layer (a controller, test conditions). */
export function useExternalStore<T>(store: ExternalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
