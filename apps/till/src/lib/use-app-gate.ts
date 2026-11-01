import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useDependencies } from './dependencies';

/** Keeps Zahln's kill switch and minimum version current while the app runs. Mounted once, at the root. */
export function useAppGate(): void {
  const { gate } = useDependencies();
  useEffect(() => {
    gate.start();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void gate.refresh();
    });
    return () => appState.remove();
  }, [gate]);
}
