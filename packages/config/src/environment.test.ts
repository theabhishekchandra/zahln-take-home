import type { SecureStorage } from '@zahln/application';
import { describe, expect, it } from 'vitest';

import { isServerUrl, resolveZahlnServer, saveServerOverride, ZAHLN_TEST_SERVER, zahlnServer } from './environment';

function memoryStorage(): SecureStorage {
  const values = new Map<string, string>();
  return {
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => void values.set(key, value),
    delete: async (key) => void values.delete(key),
  };
}

describe('zahlnServer', () => {
  it('uses the URL the build was given, without a trailing slash', () => {
    expect(zahlnServer('https://staging.zahln.de/')).toEqual({ ...ZAHLN_TEST_SERVER, baseUrl: 'https://staging.zahln.de' });
  });

  it.each([undefined, null, '', '  ', 'https://', 'http://dev.zahln.de', 'dev.zahln.de', 'https://dev zahln.de'])('falls back to the test server for %j', (given) => {
    expect(zahlnServer(given)).toEqual(ZAHLN_TEST_SERVER);
  });
});

describe('isServerUrl', () => {
  it.each(['https://dev.zahln.de', 'https://10.0.2.2:8443', 'https://mock.example.com/api'])('accepts %s', (url) => expect(isServerUrl(url)).toBe(true));
  it.each(['http://dev.zahln.de', 'ftp://x.de', 'https://', 'javascript:alert(1)'])('refuses %s', (url) => expect(isServerUrl(url)).toBe(false));
});

describe('resolveZahlnServer', () => {
  it('prefers an address saved on the device, in a build that allows it', async () => {
    const storage = memoryStorage();
    await saveServerOverride(storage, 'https://scenarios.zahln.de/');
    expect((await resolveZahlnServer({ storage, buildUrl: 'https://dev.zahln.de', allowOverride: true })).baseUrl).toBe('https://scenarios.zahln.de');
    expect((await resolveZahlnServer({ storage, buildUrl: 'https://dev.zahln.de', allowOverride: false })).baseUrl).toBe('https://dev.zahln.de');
  });

  it("goes back to the build's address once the override is removed", async () => {
    const storage = memoryStorage();
    await saveServerOverride(storage, 'https://scenarios.zahln.de');
    await saveServerOverride(storage, null);
    expect((await resolveZahlnServer({ storage, buildUrl: 'https://dev.zahln.de', allowOverride: true })).baseUrl).toBe('https://dev.zahln.de');
  });

  it('never saves an address that is not https', async () => {
    await expect(saveServerOverride(memoryStorage(), 'http://dev.zahln.de')).rejects.toThrow();
  });
});
