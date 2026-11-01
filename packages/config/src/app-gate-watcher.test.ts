import { err, ok, type Outcome, type SecureStorage, type Timers } from '@zahln/application';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppGateWatcher, storedConfigCache } from './app-gate-watcher';
import type { RemoteConfig } from './remote-config';

const timers: Timers = { set: (callback, ms) => setTimeout(callback, ms), clear: (handle) => clearTimeout(handle as never) };

function memoryStorage(): SecureStorage & { readonly values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => void values.set(key, value),
    delete: async (key) => void values.delete(key),
  };
}

const unreachable: Outcome<RemoteConfig> = err({ kind: 'not_processed', cause: 'offline', retryable: true });

describe('AppGateWatcher', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('follows the config every minute: paused, then on again', async () => {
    const answers: RemoteConfig[] = [
      { paymentsEnabled: true, minimumVersion: '1.0.0' },
      { paymentsEnabled: false, minimumVersion: '1.0.0' },
      { paymentsEnabled: true, minimumVersion: '1.0.0' },
    ];
    const fetchConfig = vi.fn(async () => ok(answers.shift()!));
    const watcher = new AppGateWatcher({ fetchConfig, cache: storedConfigCache(memoryStorage()), timers, appVersion: '1.0.0' });
    watcher.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(watcher.getSnapshot().gate).toEqual({ status: 'ok' });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(watcher.getSnapshot().gate).toEqual({ status: 'payments_disabled' });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(watcher.getSnapshot().gate).toEqual({ status: 'ok' });
    expect(fetchConfig).toHaveBeenCalledTimes(3);
    watcher.dispose();
  });

  it('asks for an update below the minimum version', async () => {
    const watcher = new AppGateWatcher({
      fetchConfig: async () => ok({ paymentsEnabled: true, minimumVersion: '2.0.0' }),
      cache: storedConfigCache(memoryStorage()),
      timers,
      appVersion: '1.4.0',
    });
    await watcher.refresh();
    expect(watcher.getSnapshot().gate).toEqual({ status: 'update_required', minimumVersion: '2.0.0' });
    watcher.dispose();
  });

  it('uses the last config it saw when Zahln is unreachable, and allows paying if it never saw one', async () => {
    const storage = memoryStorage();
    const first = new AppGateWatcher({ fetchConfig: async () => ok({ paymentsEnabled: false, minimumVersion: '1.0.0' }), cache: storedConfigCache(storage), timers, appVersion: '1.0.0' });
    await first.refresh();
    first.dispose();

    const restarted = new AppGateWatcher({ fetchConfig: async () => unreachable, cache: storedConfigCache(storage), timers, appVersion: '1.0.0' });
    await restarted.refresh();
    expect(restarted.getSnapshot().gate).toEqual({ status: 'payments_disabled' });
    restarted.dispose();

    const fresh = new AppGateWatcher({ fetchConfig: async () => unreachable, cache: storedConfigCache(memoryStorage()), timers, appVersion: '1.0.0' });
    await fresh.refresh();
    expect(fresh.getSnapshot().gate).toEqual({ status: 'ok' });
    fresh.dispose();
  });

  it('ignores a stored value it cannot read', async () => {
    const storage = memoryStorage();
    storage.values.set('zahln.remote-config', '{"paymentsEnabled":"no"}');
    expect(await storedConfigCache(storage).read()).toBeNull();
  });

  it('shares one request between calls made at the same time', async () => {
    const fetchConfig = vi.fn(async () => ok({ paymentsEnabled: true, minimumVersion: '1.0.0' }));
    const watcher = new AppGateWatcher({ fetchConfig, cache: storedConfigCache(memoryStorage()), timers, appVersion: '1.0.0' });
    await Promise.all([watcher.refresh(), watcher.refresh(), watcher.refresh()]);
    expect(fetchConfig).toHaveBeenCalledTimes(1);
    watcher.dispose();
  });
});
