import { err, ok, type GatewayError, type Outcome } from '@zahln/application';
import type { z } from 'zod';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface SessionProvider {
  accessToken(): Promise<string | null>;
  /** Called at most once per request, on a 401. Resolve true if a fresh token is now available. */
  refresh(): Promise<boolean>;
}

/** What the client learned about the server's clock from one response. */
export interface ServerTimeSample {
  /** The response's `Date` header. */
  readonly date: string;
  readonly sentAt: number;
  readonly receivedAt: number;
}

export interface HttpClientOptions {
  readonly baseUrl: string;
  readonly newRequestId: () => string;
  /** Sent with every request, e.g. `X-Candidate-Id` and `X-App-Version`. */
  readonly headers?: Readonly<Record<string, string>>;
  /** Told the server's time from every response that carries a `Date` header. */
  readonly onServerTime?: (sample: ServerTimeSample) => void;
  /** Device time in ms, for server time samples. */
  readonly now?: () => number;
  readonly session?: SessionProvider;
  /** Lets the client refuse to send when the device knows it is offline, so "not sent" is certain. */
  readonly isOnline?: () => boolean;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly random?: () => number;
}

export interface HttpRequest<T> {
  readonly method: HttpMethod;
  readonly path: string;
  readonly query?: Readonly<Record<string, string | number | undefined>>;
  readonly body?: unknown;
  /** Required for a write to be retried. Sent unchanged with every attempt. */
  readonly idempotencyKey?: string;
  /** A write that changes nothing of value (logging in), so it may be retried without a key. */
  readonly safeToRetry?: boolean;
  /** Off for the login itself, which must not try to renew the session it is creating. */
  readonly authenticated?: boolean;
  readonly schema: z.ZodType<T>;
  readonly signal?: AbortSignal;
}

export interface HttpClient {
  request<T>(request: HttpRequest<T>): Promise<Outcome<T>>;
}

/** Zahln's server can take seconds to answer; a write needs room to finish. */
const DEFAULTS = { timeoutMs: 10_000, maxAttempts: 3, baseDelayMs: 400 };

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = options.timeoutMs ?? DEFAULTS.timeoutMs;
  const maxAttempts = options.maxAttempts ?? DEFAULTS.maxAttempts;
  const baseDelayMs = options.baseDelayMs ?? DEFAULTS.baseDelayMs;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now;

  async function attempt<T>(request: HttpRequest<T>, isRead: boolean): Promise<Outcome<T>> {
    if (options.isOnline && !options.isOnline()) {
      return err({ kind: 'not_processed', cause: 'offline', retryable: true });
    }

    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), timeoutMs);
    const onCallerAbort = () => timeout.abort();
    request.signal?.addEventListener('abort', onCallerAbort);

    try {
      const token = request.authenticated === false ? null : await options.session?.accessToken();
      const headers: Record<string, string> = {
        ...options.headers,
        Accept: 'application/json, application/problem+json',
        'X-Request-Id': options.newRequestId(),
      };
      if (request.body !== undefined) headers['Content-Type'] = 'application/json';
      if (request.idempotencyKey) headers['Idempotency-Key'] = request.idempotencyKey;
      if (token) headers.Authorization = `Bearer ${token}`;

      let response: Response;
      const sentAt = now();
      try {
        response = await fetchImpl(buildUrl(options.baseUrl, request), {
          method: request.method,
          headers,
          body: request.body === undefined ? undefined : JSON.stringify(request.body),
          signal: timeout.signal,
        });
      } catch {
        // The request may have reached the server before the connection failed.
        if (isRead) return err({ kind: 'not_processed', cause: 'unavailable', retryable: true });
        return err({ kind: 'outcome_unknown', cause: timeout.signal.aborted ? 'timeout' : 'connection_lost' });
      }

      const date = response.headers.get('Date');
      if (date) options.onServerTime?.({ date, sentAt, receivedAt: now() });
      return await interpret(response, request.schema, isRead);
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener('abort', onCallerAbort);
    }
  }

  return {
    async request<T>(request: HttpRequest<T>): Promise<Outcome<T>> {
      const isRead = request.method === 'GET';
      const canRetry = isRead || request.idempotencyKey !== undefined || request.safeToRetry === true;
      let mayHaveBeenApplied = false;
      let refreshedSession = false;
      let last: GatewayError | undefined;

      for (let attemptNo = 1; attemptNo <= maxAttempts; attemptNo++) {
        const result = await attempt(request, isRead);
        if (result.ok) return result;
        const error = result.error;

        const renewable = request.authenticated !== false && options.session && !refreshedSession;
        if (error.kind === 'not_processed' && error.cause === 'unauthorized' && renewable && options.session) {
          refreshedSession = true;
          if (await options.session.refresh()) {
            attemptNo--; // a session refresh does not use up a retry
            continue;
          }
        }

        if (error.kind === 'outcome_unknown') mayHaveBeenApplied = true;
        last = error;

        const retryable = error.kind === 'outcome_unknown' || error.retryable;
        if (!canRetry || !retryable || attemptNo === maxAttempts || request.signal?.aborted) break;
        await sleep(backoffMs(attemptNo, baseDelayMs, random));
      }

      if (!last) throw new Error('unreachable: request loop ended without a result');
      // Once any attempt may have been applied, only a definitive server answer
      // can settle it; "offline" or "busy" on a later attempt proves nothing.
      if (!isRead && mayHaveBeenApplied && last.kind === 'not_processed' && last.cause !== 'rejected') {
        return err({ kind: 'outcome_unknown', cause: 'connection_lost' });
      }
      return err(last);
    },
  };
}

/**
 * Zahln answers errors as problem+json with a stable `code`. What decides the
 * client's next step is whether the server could have applied the request.
 */
async function interpret<T>(response: Response, schema: z.ZodType<T>, isRead: boolean): Promise<Outcome<T>> {
  const body = await readJson(response);

  if (response.ok) {
    const parsed = schema.safeParse(body);
    if (parsed.success) return ok(parsed.data);
    if (isRead) return err({ kind: 'not_processed', cause: 'unavailable', code: 'invalid_response', retryable: false });
    return err({ kind: 'outcome_unknown', cause: 'invalid_response' });
  }

  const code = errorCode(body);
  const status = response.status;
  const withCode = code ? { code } : {};
  if (status === 401) return err({ kind: 'not_processed', cause: 'unauthorized', retryable: false, ...withCode });
  if (status === 429) return err({ kind: 'not_processed', cause: 'rate_limited', retryable: true, ...withCode });
  if (status === 408) return err({ kind: 'not_processed', cause: 'unavailable', retryable: true });
  if (status >= 400 && status < 500) return err({ kind: 'not_processed', cause: 'rejected', retryable: false, ...withCode });
  // 503: refused before anything happened. `payments_disabled` is a decision, not a hiccup.
  if (status === 503) {
    if (code && code !== 'unavailable') return err({ kind: 'not_processed', cause: 'rejected', retryable: false, code });
    return err({ kind: 'not_processed', cause: 'unavailable', retryable: true, ...withCode });
  }
  // 502 connection_dropped, 504 timeout, any other 5xx: a write may have been applied.
  if (isRead) return err({ kind: 'not_processed', cause: 'unavailable', retryable: true, ...withCode });
  return err({ kind: 'outcome_unknown', cause: status === 504 ? 'timeout' : status === 502 ? 'connection_lost' : 'server_error' });
}

async function readJson(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return undefined;
  }
}

function errorCode(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'code' in body && typeof body.code === 'string') return body.code;
  return undefined;
}

function buildUrl(baseUrl: string, request: HttpRequest<unknown>): string {
  const url = new URL(request.path.replace(/^\//, ''), baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/** Exponential backoff with full jitter, so a whole mensa of phones doesn't retry in lockstep. */
function backoffMs(attemptNo: number, baseDelayMs: number, random: () => number): number {
  return Math.round(random() * baseDelayMs * 2 ** (attemptNo - 1));
}
