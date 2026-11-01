import { createZahlnApi, type ZahlnApi } from '@zahln/api-client';
import type { Credentials, Telemetry, Timers } from '@zahln/application';

import type { FakeZahlnApi } from './fake-api';

/**
 * One device talking to the fake server through the real HTTP adapters: the
 * phone and the till in a test are two of these against one `FakeZahlnApi`.
 *
 * `maxAttempts` defaults to 1 so each injected fault reaches the controller
 * as it happened; pass more to test the client's own retries.
 */
export async function deviceFor(fake: FakeZahlnApi, credentials: Credentials, options: { readonly maxAttempts?: number; readonly appVersion?: string } = {}): Promise<ZahlnApi> {
  let n = 0;
  const api = createZahlnApi({
    baseUrl: 'https://fake.zahln.test',
    candidateId: 'c_test',
    appVersion: options.appVersion ?? '1.0.0',
    newRequestId: () => `req-${++n}`,
    fetch: fake.fetch,
    maxAttempts: options.maxAttempts ?? 1,
    sleep: async () => {},
    random: () => 0,
  });
  const signedIn = await api.session.signIn(credentials);
  if (!signedIn.ok) throw new Error(`Sign-in failed for ${credentials.username}`);
  return api;
}

/** Real timers' shape, so `vi.useFakeTimers()` drives them. */
export const testTimers: Timers = { set: (callback, ms) => setTimeout(callback, ms), clear: (handle) => clearTimeout(handle as never) };

export const silentTelemetry: Telemetry = { event: () => {}, error: () => {} };
