import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAccount } from './account';
import { useDependencies } from './dependencies';

/**
 * Settles the signed-in payer's payments left open: on sign-in, on return to
 * the foreground and when the connection comes back. Mounted once, at the root.
 */
export function useRecovery(): void {
  const { payFlow, connectivity, telemetry } = useDependencies();
  // Only a payment's own payer may settle it, so each sign-in looks again.
  const userId = useAccount().user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    const recover = () => payFlow.recover().catch((error: unknown) => telemetry.error(error, { where: 'recovery' }));
    recover();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') recover();
    });
    const offConnectivity = connectivity.subscribe((online) => {
      if (online) recover();
    });
    return () => {
      appState.remove();
      offConnectivity();
    };
  }, [payFlow, connectivity, telemetry, userId]);
}
