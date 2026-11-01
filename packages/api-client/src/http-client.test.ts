import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createHttpClient, type HttpClientOptions } from './http-client';

type Reply = { status: number; body?: unknown; headers?: Record<string, string> } | 'hang' | 'network_error';

/** A fetch that answers from a script and records every request it saw. */
function scriptedFetch(replies: Reply[]) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, headers: init.headers as Record<string, string> });
    const reply = replies.shift();
    if (!reply) throw new Error('unexpected request');
    if (reply === 'network_error') throw new TypeError('Network request failed');
    if (reply === 'hang') {
      return new Promise<Response>((_, reject) =>
        init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
      );
    }
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), { status: reply.status, headers: reply.headers });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, calls };
}

let requestCounter = 0;
const client = (fetch: typeof globalThis.fetch, extra: Partial<HttpClientOptions> = {}) =>
  createHttpClient({
    baseUrl: 'https://api.test/v1',
    newRequestId: () => `req-${++requestCounter}`,
    fetch,
    timeoutMs: 20,
    sleep: async () => {},
    random: () => 0.5,
    ...extra,
  });

const Payment = z.object({ id: z.string(), status: z.string() });
const post = { method: 'POST' as const, path: '/payments', body: {}, schema: Payment };

describe('reads', () => {
  it('validates the response against the schema', async () => {
    const { fetch, calls } = scriptedFetch([{ status: 200, body: { id: 'p1', status: 'confirmed' } }]);
    const result = await client(fetch).request({ method: 'GET', path: '/payments/p1', query: { a: 1, b: undefined }, schema: Payment });
    expect(result).toEqual({ ok: true, value: { id: 'p1', status: 'confirmed' } });
    expect(calls[0]?.url).toBe('https://api.test/v1/payments/p1?a=1');
  });

  it('retries transient failures', async () => {
    const { fetch, calls } = scriptedFetch(['network_error', { status: 503 }, { status: 200, body: { id: 'p1', status: 'x' } }]);
    const result = await client(fetch).request({ method: 'GET', path: '/p', schema: Payment });
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(3);
  });
});

describe('writes', () => {
  it('retries a timed-out write with the same idempotency key and a new request id', async () => {
    const { fetch, calls } = scriptedFetch(['hang', { status: 201, body: { id: 'p1', status: 'processing' } }]);
    const result = await client(fetch).request({ ...post, idempotencyKey: 'key-1' });
    expect(result.ok).toBe(true);
    expect(calls.map((c) => c.headers['Idempotency-Key'])).toEqual(['key-1', 'key-1']);
    expect(calls[0]?.headers['X-Request-Id']).not.toBe(calls[1]?.headers['X-Request-Id']);
  });

  it('never retries a write without an idempotency key, and reports the outcome as unknown', async () => {
    const { fetch, calls } = scriptedFetch(['hang']);
    const result = await client(fetch).request(post);
    expect(result).toEqual({ ok: false, error: { kind: 'outcome_unknown', cause: 'timeout' } });
    expect(calls).toHaveLength(1);
  });

  it('stays unknown if a later attempt only proves the network is down', async () => {
    const { fetch } = scriptedFetch(['network_error', { status: 503 }, { status: 429 }]);
    const result = await client(fetch).request({ ...post, idempotencyKey: 'key-1' });
    expect(result).toEqual({ ok: false, error: { kind: 'outcome_unknown', cause: 'connection_lost' } });
  });

  it('trusts a definitive rejection from the server', async () => {
    const { fetch } = scriptedFetch(['hang', { status: 422, body: { code: 'quote_expired' } }]);
    const result = await client(fetch).request({ ...post, idempotencyKey: 'key-1' });
    expect(result).toEqual({
      ok: false,
      error: { kind: 'not_processed', cause: 'rejected', code: 'quote_expired', retryable: false },
    });
  });

  it('treats an unreadable success response to a write as unknown', async () => {
    const { fetch } = scriptedFetch([{ status: 200, body: { unexpected: true } }]);
    const result = await client(fetch, { maxAttempts: 1 }).request({ ...post, idempotencyKey: 'key-1' });
    expect(result).toEqual({ ok: false, error: { kind: 'outcome_unknown', cause: 'invalid_response' } });
  });

  it('does not send at all when the device knows it is offline', async () => {
    const { fetch, calls } = scriptedFetch([]);
    const result = await client(fetch, { isOnline: () => false, maxAttempts: 1 }).request({ ...post, idempotencyKey: 'k' });
    expect(result).toEqual({ ok: false, error: { kind: 'not_processed', cause: 'offline', retryable: true } });
    expect(calls).toHaveLength(0);
  });
});

describe('session', () => {
  it('refreshes an expired session once and retries with the new token', async () => {
    let token = 'old';
    let refreshes = 0;
    const session = {
      accessToken: async () => token,
      refresh: async () => {
        refreshes++;
        token = 'new';
        return true;
      },
    };
    const { fetch, calls } = scriptedFetch([{ status: 401 }, { status: 200, body: { id: 'p1', status: 'x' } }]);
    const result = await client(fetch, { session }).request({ method: 'GET', path: '/p', schema: Payment });
    expect(result.ok).toBe(true);
    expect(refreshes).toBe(1);
    expect(calls.map((c) => c.headers.Authorization)).toEqual(['Bearer old', 'Bearer new']);
  });

  it('gives up after one refresh', async () => {
    const session = { accessToken: async () => 't', refresh: async () => true };
    const { fetch } = scriptedFetch([{ status: 401 }, { status: 401 }]);
    const result = await client(fetch, { session }).request({ method: 'GET', path: '/p', schema: Payment });
    expect(result).toEqual({ ok: false, error: { kind: 'not_processed', cause: 'unauthorized', retryable: false } });
  });
});

const problem = (status: number, code: string) => ({ status, body: { code, title: code, status, retryable: false } });

describe("Zahln's errors", () => {
  it.each([
    [503, 'payments_disabled', { kind: 'not_processed', cause: 'rejected', code: 'payments_disabled' }],
    [409, 'order_expired', { kind: 'not_processed', cause: 'rejected', code: 'order_expired' }],
    [426, 'app_version_unsupported', { kind: 'not_processed', cause: 'rejected', code: 'app_version_unsupported' }],
  ])('%i %s is a definite refusal: nothing happened', async (status, code, expected) => {
    const { fetch } = scriptedFetch([problem(status, code)]);
    expect(await client(fetch).request({ ...post, idempotencyKey: 'k' })).toEqual({ ok: false, error: expect.objectContaining(expected) });
  });

  it('503 unavailable happened before anything did, so a write is retried and stays "not processed"', async () => {
    const { fetch, calls } = scriptedFetch([problem(503, 'unavailable'), problem(503, 'unavailable'), problem(503, 'unavailable')]);
    const result = await client(fetch).request({ ...post, idempotencyKey: 'k' });
    expect(calls).toHaveLength(3);
    expect(result).toEqual({ ok: false, error: expect.objectContaining({ kind: 'not_processed', cause: 'unavailable' }) });
  });

  it.each([
    [502, 'connection_dropped', 'connection_lost'],
    [504, 'timeout', 'timeout'],
  ])('%i %s on a write may have been applied: the outcome is unknown', async (status, code, cause) => {
    const { fetch } = scriptedFetch([problem(status, code)]);
    expect(await client(fetch, { maxAttempts: 1 }).request({ ...post, idempotencyKey: 'k' })).toEqual({ ok: false, error: { kind: 'outcome_unknown', cause } });
  });

  it('a 504 then a refusal of the repeat: the refusal settles it, since the key would have replayed', async () => {
    const { fetch } = scriptedFetch([problem(504, 'timeout'), problem(409, 'order_expired')]);
    const result = await client(fetch).request({ ...post, idempotencyKey: 'k' });
    expect(result).toEqual({ ok: false, error: expect.objectContaining({ kind: 'not_processed', cause: 'rejected', code: 'order_expired' }) });
  });
});

describe('headers and server time', () => {
  it('sends the fixed headers with every request, and reports the server time', async () => {
    const samples: unknown[] = [];
    let t = 1_000;
    const { fetch, calls } = scriptedFetch([{ status: 200, body: { id: 'p', status: 'pending' }, headers: { Date: 'Sat, 31 Oct 2026 10:10:24 GMT' } }]);
    await client(fetch, { headers: { 'X-Candidate-Id': 'c_1' }, now: () => (t += 100), onServerTime: (s) => samples.push(s) }).request({
      method: 'GET',
      path: '/payments/p',
      schema: Payment,
    });
    expect(calls[0]?.headers['X-Candidate-Id']).toBe('c_1');
    expect(samples).toEqual([{ date: 'Sat, 31 Oct 2026 10:10:24 GMT', sentAt: 1_100, receivedAt: 1_200 }]);
  });

  it('a login retries without a key, and never asks the session for a token', async () => {
    let asked = 0;
    const session = { accessToken: async () => (asked++, 't'), refresh: async () => true };
    const { fetch, calls } = scriptedFetch([problem(503, 'unavailable'), { status: 201, body: { id: 'p', status: 'x' } }]);
    const result = await client(fetch, { session }).request({ ...post, safeToRetry: true, authenticated: false });
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(2);
    expect(asked).toBe(0);
  });
});
