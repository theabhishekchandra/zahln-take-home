import { Store, type Outcome, type SecureStorage, type Timers } from '@zahln/application';

import { evaluateAppGate, loadRemoteConfig, type AppGate, type RemoteConfig, type RemoteConfigCache } from './remote-config';

export interface AppGateDeps {
  readonly fetchConfig: () => Promise<Outcome<RemoteConfig>>;
  readonly cache: RemoteConfigCache;
  readonly timers: Timers;
  readonly appVersion: string;
  /** How often to read the config while the app runs. */
  readonly refreshMs?: number;
}

/**
 * Whether this build may start a payment, kept current from `GET /config`.
 * Read on start, every minute, and whenever the server refused a payment for
 * a reason the config explains. The server enforces both rules itself; this
 * only lets the apps say so before anyone tries to pay.
 */
export class AppGateWatcher {
  private readonly store = new Store<{ readonly gate: AppGate }>({ gate: { status: 'ok' } });
  private readonly deps: AppGateDeps;
  private timer: unknown = null;
  private loading: Promise<void> | null = null;
  private disposed = false;

  readonly subscribe = this.store.subscribe;
  readonly getSnapshot = this.store.get;

  constructor(deps: AppGateDeps) {
    this.deps = deps;
  }

  start(): void {
    if (this.timer === null && !this.disposed) void this.refresh();
  }

  /** Reads the config now. Calls while one is under way share it. */
  refresh(): Promise<void> {
    this.loading ??= this.load().finally(() => {
      this.loading = null;
    });
    return this.loading;
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer !== null) this.deps.timers.clear(this.timer);
    this.timer = null;
    this.store.clearListeners();
  }

  private async load(): Promise<void> {
    const config = await loadRemoteConfig(this.deps);
    if (this.disposed) return;
    this.store.update({ gate: evaluateAppGate(config, { version: this.deps.appVersion }) });
    if (this.timer !== null) this.deps.timers.clear(this.timer);
    this.timer = this.deps.timers.set(() => void this.refresh(), this.deps.refreshMs ?? 60_000);
  }
}

/** Keeps the last config seen, so a restart while Zahln is unreachable still knows it. */
export function storedConfigCache(storage: SecureStorage, key = 'zahln.remote-config'): RemoteConfigCache {
  return {
    async read() {
      const text = await storage.get(key);
      if (!text) return null;
      try {
        const value: unknown = JSON.parse(text);
        return isRemoteConfig(value) ? value : null;
      } catch {
        return null;
      }
    },
    write: (config) => storage.set(key, JSON.stringify(config)),
  };
}

function isRemoteConfig(value: unknown): value is RemoteConfig {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.paymentsEnabled === 'boolean' && typeof candidate.minimumVersion === 'string';
}
