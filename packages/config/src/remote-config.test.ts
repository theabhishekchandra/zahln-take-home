import { err, ok } from '@zahln/application';
import { describe, expect, it } from 'vitest';

import { compareVersions, evaluateAppGate, loadRemoteConfig, type RemoteConfig } from './remote-config';

const config = (over: Partial<RemoteConfig> = {}): RemoteConfig => ({
  paymentsEnabled: true,
  minimumVersion: '1.2.0',
  ...over,
});

describe('compareVersions', () => {
  it('compares numerically, not as text', () => {
    expect(compareVersions('1.10.0', '1.9.3')).toBeGreaterThan(0);
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1.1.9', '1.2.0')).toBeLessThan(0);
  });
});

describe('evaluateAppGate', () => {
  it('lets the app pay when it has never seen a config', () => {
    expect(evaluateAppGate(null, { version: '0.1.0' })).toEqual({ status: 'ok' });
  });

  it('requires an update below the minimum version, before anything else', () => {
    expect(evaluateAppGate(config({ paymentsEnabled: false }), { version: '1.1.0' })).toEqual({
      status: 'update_required',
      minimumVersion: '1.2.0',
    });
  });

  it('honours the kill switch', () => {
    expect(evaluateAppGate(config({ paymentsEnabled: false }), { version: '2.0.0' })).toEqual({
      status: 'payments_disabled',
    });
  });
});

describe('loadRemoteConfig', () => {
  it('caches a fresh config and falls back to the cache when offline', async () => {
    let cached: RemoteConfig | null = null;
    const cache = { read: async () => cached, write: async (c: RemoteConfig) => void (cached = c) };

    expect(await loadRemoteConfig({ fetchConfig: async () => ok(config()), cache })).toEqual(config());
    const offline = await loadRemoteConfig({
      fetchConfig: async () => err({ kind: 'not_processed', cause: 'offline', retryable: true }),
      cache,
    });
    expect(offline).toEqual(config());
  });
});
