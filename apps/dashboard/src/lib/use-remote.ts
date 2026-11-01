import type { GatewayError, Outcome, Page } from '@zahln/application';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';

import { useAuth } from './auth';

/** W9: how long to wait before asking again after the server didn't answer. */
export const RETRY_MS = 30_000;

export interface Remote<T> {
  /** The last good answer, kept while a reload fails. */
  readonly data: T | null;
  readonly savedAt: Date | null;
  readonly loading: boolean;
  /** The last attempt failed; `data`, if any, is out of date. */
  readonly failed: boolean;
  /** When the next automatic try is due (epoch ms), while failed. */
  readonly retryAt: number | null;
  readonly retry: () => void;
}

const isUnauthorized = (error: GatewayError) => error.kind === 'not_processed' && error.cause === 'unauthorized';

/** Which question is being asked: `n` grows with every attempt. */
interface Request {
  readonly key: string;
  readonly n: number;
}

interface Answer<T> {
  readonly key: string;
  /** The attempt this answers. While it's behind the request, a load is under way. */
  readonly n: number;
  readonly data: T | null;
  readonly savedAt: Date | null;
  readonly failed: boolean;
  readonly retryAt: number | null;
}

/**
 * Loads `load()` when `key` changes, keeps the last good answer when a reload
 * fails and tries again every 30 s. A login that can't be renewed ends the
 * session instead. Only reads go through here: nothing is ever sent twice.
 * While `enabled` is false nothing is asked for, e.g. while a form is invalid.
 */
export function useRemote<T>(load: () => Promise<Outcome<T>>, key: string, enabled = true): Remote<T> {
  const { expire } = useAuth();
  const [request, setRequest] = useState<Request>({ key, n: 0 });
  const [answer, setAnswer] = useState<Answer<T>>({ key, n: -1, data: null, savedAt: null, failed: false, retryAt: null });

  // Another key is another question: its old answer must not show.
  if (request.key !== key) {
    setRequest({ key, n: request.n + 1 });
    setAnswer({ key, n: -1, data: null, savedAt: null, failed: false, retryAt: null });
  }

  const run = useEffectEvent(() => load());
  const retry = useCallback(() => setRequest((r) => ({ ...r, n: r.n + 1 })), []);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void run().then((result) => {
      if (!live) return;
      if (result.ok) return setAnswer({ key: request.key, n: request.n, data: result.value, savedAt: new Date(), failed: false, retryAt: null });
      if (isUnauthorized(result.error)) return expire();
      setAnswer((a) => ({ ...a, n: request.n, failed: true, retryAt: Date.now() + RETRY_MS }));
      timer = setTimeout(retry, RETRY_MS);
    });
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [request, expire, retry, enabled]);

  return { data: answer.data, savedAt: answer.savedAt, loading: enabled && answer.n !== request.n, failed: answer.failed, retryAt: answer.retryAt, retry };
}

export interface Paged<T> {
  readonly items: readonly T[];
  /** When the last page arrived; the list is kept while a load fails. */
  readonly savedAt: Date | null;
  readonly loading: boolean;
  readonly failed: boolean;
  /** When the next automatic try is due (epoch ms), while failed. */
  readonly retryAt: number | null;
  readonly hasMore: boolean;
  readonly loadMore: () => void;
  readonly retry: () => void;
}

interface PageRequest extends Request {
  readonly cursor?: string;
}

interface PageAnswer<T> {
  readonly key: string;
  readonly n: number;
  readonly items: readonly T[];
  readonly cursor: string | null;
  readonly savedAt: Date | null;
  readonly failed: boolean;
  readonly retryAt: number | null;
}

const emptyPage = <T>(key: string): PageAnswer<T> => ({ key, n: -1, items: [], cursor: null, savedAt: null, failed: false, retryAt: null });

/**
 * A cursor-paged list that grows with "Load more". Starts over when `key`
 * changes. Like `useRemote`, a failed page is asked for again every 30 s.
 */
export function usePaged<T>(load: (cursor?: string) => Promise<Outcome<Page<T>>>, key: string): Paged<T> {
  const { expire } = useAuth();
  const [request, setRequest] = useState<PageRequest>({ key, n: 0 });
  const [answer, setAnswer] = useState<PageAnswer<T>>(() => emptyPage(key));

  if (request.key !== key) {
    setRequest({ key, n: request.n + 1 });
    setAnswer(emptyPage(key));
  }

  const run = useEffectEvent((cursor?: string) => load(cursor));
  const retry = useCallback(() => setRequest((r) => ({ ...r, n: r.n + 1 })), []);

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void run(request.cursor).then((result) => {
      if (!live) return;
      if (!result.ok) {
        if (isUnauthorized(result.error)) return expire();
        setAnswer((a) => ({ ...a, n: request.n, failed: true, retryAt: Date.now() + RETRY_MS }));
        timer = setTimeout(retry, RETRY_MS);
        return;
      }
      setAnswer((a) => ({
        key: request.key,
        n: request.n,
        items: request.cursor && a.key === request.key ? [...a.items, ...result.value.items] : result.value.items,
        cursor: result.value.nextCursor,
        savedAt: new Date(),
        failed: false,
        retryAt: null,
      }));
    });
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [request, expire, retry]);

  return {
    items: answer.items,
    savedAt: answer.savedAt,
    loading: answer.n !== request.n,
    failed: answer.failed,
    retryAt: answer.retryAt,
    hasMore: answer.cursor !== null,
    loadMore: () => {
      if (answer.cursor) setRequest({ key, cursor: answer.cursor, n: request.n + 1 });
    },
    retry,
  };
}
