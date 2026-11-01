import type { Connectivity } from '@zahln/application';
import * as Network from 'expo-network';

/**
 * Connection state from the OS. Starts optimistic: until the first reading
 * arrives, requests go out and fail as "offline" on their own if they must.
 */
export function createConnectivity(): Connectivity {
  let online = true;
  const listeners = new Set<(online: boolean) => void>();
  const set = (state: Network.NetworkState) => {
    const next = state.isConnected !== false && state.isInternetReachable !== false;
    if (next === online) return;
    online = next;
    for (const listener of listeners) listener(online);
  };
  Network.getNetworkStateAsync().then(set, () => undefined);
  Network.addNetworkStateListener(set);
  return {
    isOnline: () => online,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
