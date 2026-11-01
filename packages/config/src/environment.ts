import type { SecureStorage } from '@zahln/application';

/**
 * Zahln's test server for the take-home (spec: docs/api/openapi.json). The
 * candidate ID only keeps this candidate's data apart on it; it is not a
 * secret. A production build would take both from its release configuration.
 */
export const ZAHLN_TEST_SERVER = {
  baseUrl: 'https://dev.zahln.de',
  candidateId: 'c_09810f31b8',
} as const;

export interface ZahlnServer {
  readonly baseUrl: string;
  readonly candidateId: string;
}

const HTTPS_URL = /^https:\/\/[a-z0-9.-]+(:\d+)?(\/[^\s]*)?$/i;

/** An https address with a host. Anything else is refused, so a typo can't send payments in the clear. */
export function isServerUrl(text: string): boolean {
  return HTTPS_URL.test(text.trim());
}

/** The server for a given URL (each EAS build profile sets one); anything that isn't https means the test server. */
export function zahlnServer(baseUrl: string | undefined | null): ZahlnServer {
  const given = baseUrl?.trim().replace(/\/+$/, '');
  return { ...ZAHLN_TEST_SERVER, baseUrl: given && isServerUrl(given) ? given : ZAHLN_TEST_SERVER.baseUrl };
}

const OVERRIDE_KEY = 'zahln.server-override';

/**
 * The server for this launch. Test builds may keep an address saved on the
 * device, so Zahln can point a build at another server without a rebuild;
 * otherwise the build's own. Read once at start, so a session, a
 * payment in doubt or the server clock never moves between servers.
 */
export async function resolveZahlnServer(deps: {
  readonly storage: SecureStorage;
  readonly buildUrl: string | undefined;
  readonly allowOverride: boolean;
}): Promise<ZahlnServer> {
  const saved = deps.allowOverride ? await deps.storage.get(OVERRIDE_KEY).catch(() => null) : null;
  return zahlnServer(saved && isServerUrl(saved) ? saved : deps.buildUrl);
}

/** Saves the address for the next launch; null goes back to the build's own. */
export async function saveServerOverride(storage: SecureStorage, url: string | null): Promise<void> {
  if (url === null) return storage.delete(OVERRIDE_KEY);
  if (!isServerUrl(url)) throw new Error('Not an https address');
  return storage.set(OVERRIDE_KEY, url.trim().replace(/\/+$/, ''));
}
