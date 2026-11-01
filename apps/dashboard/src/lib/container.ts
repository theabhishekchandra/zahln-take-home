import { cryptoIds } from '@zahln/adapters-web';
import { createZahlnApi } from '@zahln/api-client';
import type { FinanceDeps, TotalsCache } from '@zahln/application';
import { zahlnServer } from '@zahln/config';
import type { DailyTotals } from '@zahln/domain';
import { consoleSink, createTelemetry } from '@zahln/telemetry';

/**
 * Composition root: the only place that decides which adapter backs each port.
 * Server ports are Zahln's API; the dashboard signs in with the finance login.
 * Business days and "today" follow the server's clock, learned from its responses.
 */
export function createContainer() {
  const zahln = createZahlnApi({ ...zahlnServer(import.meta.env.VITE_ZAHLN_BASE_URL), appVersion: '1.0.0', newRequestId: cryptoIds.uuid });
  const finance: FinanceDeps = { reports: zahln.reports, payments: zahln.payments, clock: zahln.clock };
  return {
    session: zahln.session,
    finance,
    mensas: zahln.mensas,
    totalsCache: sessionTotalsCache(),
    telemetry: createTelemetry({ context: { app: 'dashboard' }, sinks: [consoleSink] }),
  } as const;
}

export type Container = ReturnType<typeof createContainer>;

/** Closed days' totals for this browser tab, so the trend isn't asked for again on every visit. */
function sessionTotalsCache(storage: Storage = window.sessionStorage): TotalsCache {
  const key = (day: string) => `zahln.totals.${day}`;
  return {
    get(day) {
      const text = storage.getItem(key(day));
      if (!text) return null;
      try {
        return JSON.parse(text) as DailyTotals;
      } catch {
        return null;
      }
    },
    set: (day, totals) => storage.setItem(key(day), JSON.stringify(totals)),
  };
}
