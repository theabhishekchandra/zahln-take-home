import type { Payment } from '@zahln/domain';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';

import { useDependencies } from '@/lib/dependencies';
import { useOnline } from '@/lib/use-online';

const PAGE = 30;

interface Request {
  readonly n: number;
  /** Absent: the first page, read again from the top. */
  readonly cursor?: string;
}

interface Pages {
  /** The request this answers; behind the latest request while a load runs. */
  readonly n: number;
  readonly items: readonly Payment[];
  readonly cursor: string | null;
  readonly failed: boolean;
}

/**
 * The payer's payments, newest first, a page at a time. Reloads from the top
 * whenever the screen is shown or the connection returns, and keeps what it
 * has when a reload fails, so the list is still there offline.
 */
export function usePaymentPages() {
  const { activity, telemetry } = useDependencies();
  const online = useOnline();
  const [request, setRequest] = useState<Request>({ n: 0 });
  const [pages, setPages] = useState<Pages>({ n: -1, items: [], cursor: null, failed: false });

  const load = useEffectEvent((cursor?: string) => activity.payments.list({ limit: PAGE, cursor }));

  useEffect(() => {
    let live = true;
    load(request.cursor).then(
      (result) => {
        if (!live) return;
        if (!result.ok) return setPages((p) => ({ ...p, n: request.n, failed: true }));
        setPages((p) => ({
          n: request.n,
          items: request.cursor ? [...p.items, ...result.value.items] : result.value.items,
          cursor: result.value.nextCursor,
          failed: false,
        }));
      },
      (error: unknown) => telemetry.error(error, { where: 'activity.list' }),
    );
    return () => {
      live = false;
    };
  }, [request, telemetry]);

  const reload = useCallback(() => {
    if (online) setRequest((r) => ({ n: r.n + 1 }));
  }, [online]);
  useFocusEffect(reload);

  return {
    items: pages.items,
    loading: pages.n !== request.n,
    failed: pages.failed,
    hasMore: pages.cursor !== null,
    loadMore: () => {
      if (pages.cursor) setRequest({ n: request.n + 1, cursor: pages.cursor });
    },
    retry: reload,
  };
}
