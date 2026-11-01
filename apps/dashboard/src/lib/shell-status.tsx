import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** How many payments need a look, as far as the page that last loaded them knows. */
export interface AttentionCount {
  readonly count: number;
  /** More are flagged than were loaded: shown as "3+". */
  readonly more: boolean;
}

/** What pages tell the sidebar. It asks the server nothing itself, so it adds no requests. */
export interface ShellStatus {
  readonly attention: AttentionCount | null;
  /** The page on screen couldn't reach Zahln (W9). */
  readonly offline: boolean;
}

interface Reports {
  setAttention(count: AttentionCount): void;
  setOffline(offline: boolean): void;
}

const StatusContext = createContext<ShellStatus>({ attention: null, offline: false });
const ReportsContext = createContext<Reports>({ setAttention() {}, setOffline() {} });

export function ShellStatusProvider({ children }: { readonly children: ReactNode }) {
  const [attention, setAttention] = useState<AttentionCount | null>(null);
  const [offline, setOffline] = useState(false);
  const status = useMemo(() => ({ attention, offline }), [attention, offline]);
  const reports = useMemo<Reports>(() => ({ setAttention, setOffline }), []);
  return (
    <ReportsContext.Provider value={reports}>
      <StatusContext.Provider value={status}>{children}</StatusContext.Provider>
    </ReportsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useShellStatus(): ShellStatus {
  return useContext(StatusContext);
}

/** "3", or "3+" when more are flagged than were loaded. */
// eslint-disable-next-line react-refresh/only-export-components
export const attentionBadge = (attention: AttentionCount) => `${attention.count}${attention.more ? '+' : ''}`;

/** A page reports whether Zahln answered it; leaving the page clears it. */
// eslint-disable-next-line react-refresh/only-export-components
export function useReportOffline(failed: boolean) {
  const { setOffline } = useContext(ReportsContext);
  useEffect(() => {
    setOffline(failed);
    return () => setOffline(false);
  }, [failed, setOffline]);
}

/** A page that loaded the attention list reports its length; `null` while it has none to report. */
// eslint-disable-next-line react-refresh/only-export-components
export function useReportAttention(attention: AttentionCount | null) {
  const { setAttention } = useContext(ReportsContext);
  const count = attention?.count;
  const more = attention?.more;
  useEffect(() => {
    if (count !== undefined && more !== undefined) setAttention({ count, more });
  }, [count, more, setAttention]);
}
