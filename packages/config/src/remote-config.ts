import type { Outcome } from '@zahln/application';

/** Set by Zahln operations without shipping a release (`GET /config`). */
export interface RemoteConfig {
  /** Kill switch: when false, no new payment can be started. Payments already in flight still settle. */
  readonly paymentsEnabled: boolean;
  /** Builds older than this must update before they can pay. One value for every platform. */
  readonly minimumVersion: string;
}

export type AppGate =
  | { readonly status: 'ok' }
  | { readonly status: 'update_required'; readonly minimumVersion: string }
  | { readonly status: 'payments_disabled' };

/**
 * Decides whether this build may start a payment. An app that has never
 * received a config is allowed: a config outage must not stop the mensa.
 */
export function evaluateAppGate(config: RemoteConfig | null, app: { version: string }): AppGate {
  if (!config) return { status: 'ok' };
  const { minimumVersion } = config;
  if (compareVersions(app.version, minimumVersion) < 0) return { status: 'update_required', minimumVersion };
  if (!config.paymentsEnabled) return { status: 'payments_disabled' };
  return { status: 'ok' };
}

/** Compares dotted numeric versions: "1.10.0" > "1.9.3". Missing segments count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export interface RemoteConfigCache {
  read(): Promise<RemoteConfig | null>;
  write(config: RemoteConfig): Promise<void>;
}

/** Fresh config when reachable, otherwise the last one we saw, otherwise null. */
export async function loadRemoteConfig(deps: {
  fetchConfig: () => Promise<Outcome<RemoteConfig>>;
  cache: RemoteConfigCache;
}): Promise<RemoteConfig | null> {
  const fresh = await deps.fetchConfig();
  if (fresh.ok) {
    await deps.cache.write(fresh.value);
    return fresh.value;
  }
  return deps.cache.read();
}
