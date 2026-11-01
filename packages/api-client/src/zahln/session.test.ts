import { describe, expect, it } from 'vitest';

import orderCashier from '../__fixtures__/order-cashier.json';
import sessionCashier from '../__fixtures__/session-cashier.json';
import { createZahlnApi } from './api';

type Seen = { method: string; path: string; auth: string | null; key: string | null; candidate: string | null };

/** Zahln's login and one order endpoint, with tokens that the test can end. */
function server() {
  const seen: Seen[] = [];
  let logins = 0;
  let valid = new Set<string>();
  const fetch = (async (url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    const path = new URL(url).pathname;
    seen.push({ method: init.method ?? 'GET', path, auth: headers.Authorization ?? null, key: headers['Idempotency-Key'] ?? null, candidate: headers['X-Candidate-Id'] ?? null });
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { Date: new Date(Date.UTC(2026, 9, 31, 10)).toUTCString() } });
    if (path === '/sessions') {
      const token = `t${++logins}`;
      valid.add(token);
      return json(201, { ...sessionCashier, accessToken: token, expiresAt: '2026-10-31T10:05:00.000Z' });
    }
    if (!valid.has(headers.Authorization?.replace('Bearer ', '') ?? '')) {
      return json(401, { code: 'session_expired', title: 'Session expired', status: 401, retryable: true });
    }
    if (path.startsWith('/orders')) return json(200, orderCashier);
    return json(200, { minAppVersion: '1.0.0', paymentsEnabled: true });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, seen, endSessions: () => (valid = new Set()), logins: () => logins };
}

const api = (fetch: typeof globalThis.fetch) =>
  createZahlnApi({
    baseUrl: 'https://dev.zahln.test',
    candidateId: 'c_test',
    appVersion: '1.0.0',
    newRequestId: () => 'r',
    fetch,
    sleep: async () => {},
    now: () => Date.UTC(2026, 9, 31, 10),
  });

describe('ZahlnSession', () => {
  it('logs in as a seeded user and sends the token and candidate ID', async () => {
    const s = server();
    const zahln = api(s.fetch);
    const user = await zahln.session.signIn({ username: 'cashier-campus-1', password: 'test1234' });
    expect(user).toMatchObject({ ok: true, value: { role: 'cashier', tillId: 'till_campus_1' } });
    await zahln.mensas.list();
    expect(s.seen.at(-1)).toMatchObject({ path: '/mensas', auth: 'Bearer t1', candidate: 'c_test' });
  });

  it('logs in again when the server ends the session, and retries the request once', async () => {
    const s = server();
    const zahln = api(s.fetch);
    await zahln.session.signIn({ username: 'cashier-campus-1', password: 'test1234' });
    s.endSessions();
    await zahln.orders.get({ orderId: 'ord_1' as never });
    expect(s.seen.map((r) => `${r.path} ${r.auth ?? ''}`.trim())).toEqual(['/sessions', '/orders/ord_1 Bearer t1', '/sessions', '/orders/ord_1 Bearer t2']);
  });

  it('a write is retried after re-login with the same idempotency key', async () => {
    const s = server();
    const zahln = api(s.fetch);
    await zahln.session.signIn({ username: 'cashier-campus-1', password: 'test1234' });
    s.endSessions();
    await zahln.orders.create({ lines: [], idempotencyKey: 'key-1' as never });
    expect(s.seen.filter((r) => r.path === '/orders').map((r) => r.key)).toEqual(['key-1', 'key-1']);
  });

  it('requests waiting for a token share one login', async () => {
    const s = server();
    const zahln = api(s.fetch);
    await zahln.session.signIn({ username: 'cashier-campus-1', password: 'test1234' });
    s.endSessions();
    await Promise.all([zahln.orders.get({ orderId: 'a' as never }), zahln.orders.get({ orderId: 'b' as never })]);
    expect(s.logins()).toBeLessThanOrEqual(3);
  });

  it('after sign-out, requests carry no token', async () => {
    const s = server();
    const zahln = api(s.fetch);
    await zahln.session.signIn({ username: 'cashier-campus-1', password: 'test1234' });
    zahln.session.signOut();
    const result = await zahln.mensas.list();
    expect(s.seen.at(-1)?.auth).toBeNull();
    expect(result).toMatchObject({ ok: false, error: { cause: 'unauthorized' } });
  });
});

describe('ServerClock', () => {
  it("follows the server's Date header, not the device clock", async () => {
    const s = server();
    let device = Date.UTC(2026, 9, 31, 9, 55); // five minutes slow
    const zahln = createZahlnApi({ baseUrl: 'https://dev.zahln.test', candidateId: 'c', appVersion: '1.0.0', newRequestId: () => 'r', fetch: s.fetch, now: () => device });
    await zahln.config.load();
    device += 1_000;
    expect(Math.abs(zahln.clock.now().getTime() - (Date.UTC(2026, 9, 31, 10) + 1_500))).toBeLessThan(10);
  });
});
