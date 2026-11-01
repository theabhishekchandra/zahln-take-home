import { createConnectivity, createSecureStorage, cryptoIds, systemClock, systemTimers } from '@zahln/adapters-native';
import { createZahlnApi, type CashierLogin } from '@zahln/api-client';
import { err, loadTodayOnTill, ok, RefundController, SetAsideOrders, TillSaleController, type Outcome, type Result } from '@zahln/application';
import { AppGateWatcher, isServerUrl, resolveZahlnServer, saveServerOverride, storedConfigCache, zahlnServer, type ZahlnServer } from '@zahln/config';
import { isSaleSettled, type MenuItem, type MensaId, type Mensa, type Payment, type PaymentId, type RefundDraft, type TillId, type User } from '@zahln/domain';
import { consoleSink, createTelemetry } from '@zahln/telemetry';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** The work open at the till that's signed in. */
interface TillWork {
  readonly tillId: TillId;
  readonly sale: TillSaleController;
  readonly setAside: SetAsideOrders;
}

/**
 * Composition root: the only place that decides which adapter backs each port.
 * Server ports are Zahln's API. Order expiry is timed by the server's clock,
 * learned from its responses (`zahln.clock`), not the device's.
 *
 * The tablet holds one Zahln session, so it works at one till at a time: the
 * sale and set-aside orders belong to the till signed in, and another till can
 * only be opened once nothing at this one is still waiting on the server.
 */
/** The build's own server (each EAS profile sets one). Read with dot notation, so Metro inlines it. */
const BUILD_SERVER_URL = process.env.EXPO_PUBLIC_ZAHLN_BASE_URL;
/** Test builds may point at another server without a rebuild; store builds never. */
const ALLOW_SERVER_CHANGE = __DEV__ || process.env.EXPO_PUBLIC_ALLOW_SERVER_CHANGE === 'true';

/** Resolves this launch's server, then builds the container for it. */
export async function startContainer() {
  const server = await resolveZahlnServer({ storage: createSecureStorage(), buildUrl: BUILD_SERVER_URL, allowOverride: ALLOW_SERVER_CHANGE });
  return createContainer(server);
}

export function createContainer(server: ZahlnServer) {
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const connectivity = createConnectivity();
  const zahln = createZahlnApi({ ...server, appVersion: version, newRequestId: cryptoIds.uuid, isOnline: connectivity.isOnline });
  const telemetry = createTelemetry({
    context: { app: 'till', version, platform: Platform.OS },
    sinks: [consoleSink],
  });
  const ports = { orders: zahln.orders, payments: zahln.payments };
  const storage = createSecureStorage();
  const gate = new AppGateWatcher({ fetchConfig: zahln.config.load, cache: storedConfigCache(storage), timers: systemTimers, appVersion: version });

  let work: TillWork | null = null;
  const refunds = new Map<PaymentId, RefundController>();
  let mensas: Promise<Outcome<readonly Mensa[]>> | null = null;

  const startWork = (tillId: TillId): TillWork => {
    const setAside = new SetAsideOrders({ ...ports, timers: systemTimers, telemetry });
    const sale = new TillSaleController({
      ...ports,
      setAside,
      ids: cryptoIds,
      clock: systemClock,
      serverClock: zahln.clock,
      timers: systemTimers,
      telemetry,
    });
    return { tillId, sale, setAside };
  };

  const refundInFlight = (refund: RefundController) => {
    const { step } = refund.getSnapshot().flow;
    return step === 'submitting' || step === 'checking';
  };

  /**
   * True while this till has an order or refund the server hasn't settled, or
   * a late payment nobody has seen.
   */
  const busy = (current: TillWork): boolean => {
    const { sale } = current.sale.getSnapshot();
    const { watching, latePayments } = current.setAside.getSnapshot();
    return (
      (sale !== null && !isSaleSettled(sale)) || watching > 0 || latePayments.length > 0 || [...refunds.values()].some(refundInFlight)
    );
  };

  return {
    connectivity,
    telemetry,
    version,
    /** Zahln's kill switch and minimum version. Started by the root layout. */
    gate,
    /** Which server this launch uses, and (in test builds) changing it for the next one. */
    server: {
      current: server.baseUrl,
      buildDefault: zahlnServer(BUILD_SERVER_URL).baseUrl,
      canChange: ALLOW_SERVER_CHANGE,
      isValid: isServerUrl,
      /** Refused while an order or refund waits on this server: it must settle where it was made. */
      async save(url: string | null): Promise<'saved' | 'busy'> {
        if (work && busy(work)) return 'busy';
        await saveServerOverride(storage, url);
        return 'saved';
      },
    },
    /** The server's time in ms, for countdowns to a deadline the server set. */
    serverNow: () => zahln.clock.now().getTime(),
    /** The till that still has work open, which no other till may take over until it's done. */
    tillInUse(): TillId | null {
      return work && busy(work) ? work.tillId : null;
    },
    /**
     * Logs in as the till's cashier. Work open at the same till carries on;
     * opening a different one is refused while this one is busy.
     */
    async openTill(login: CashierLogin): Promise<Result<User, 'till_in_use' | 'failed'>> {
      if (work && work.tillId !== login.tillId) {
        if (busy(work)) return err('till_in_use');
        work.sale.dispose();
        work.setAside.dispose();
        for (const refund of refunds.values()) refund.dispose();
        refunds.clear();
        work = null;
      }
      const result = await zahln.session.signIn(login);
      if (!result.ok) return err('failed');
      work ??= startWork(login.tillId);
      // Work paused by an ended session carries on.
      work.sale.sessionRenewed();
      for (const refund of refunds.values()) refund.sessionRenewed();
      return ok(result.value);
    },
    signOut(): void {
      zahln.session.signOut();
    },
    /** The sale at the till signed in. */
    sale(): TillSaleController {
      if (!work) throw new Error('No till open');
      return work.sale;
    },
    /** Orders set aside at the till signed in, and any paid after all. */
    setAside(): SetAsideOrders {
      if (!work) throw new Error('No till open');
      return work.setAside;
    },
    /** The mensa's menu. Retried on the next call if loading failed; kept once it worked. */
    async loadMenu(mensaId: MensaId): Promise<Outcome<readonly MenuItem[]>> {
      mensas ??= zahln.mensas.list().then((result) => {
        if (!result.ok) mensas = null;
        return result;
      });
      const result = await mensas;
      if (!result.ok) return result;
      return { ok: true, value: result.value.find((mensa) => mensa.id === mensaId)?.menu ?? [] };
    },
    /** Today's payments on this till, to refund one. The server lists only this cashier's till. */
    loadToday(): Promise<Outcome<readonly Payment[]>> {
      return loadTodayOnTill({ payments: zahln.payments, clock: systemClock });
    },
    /** One payment as the server has it now, e.g. a late payment to refund. */
    loadPayment: (id: PaymentId) => zahln.payments.get(id),
    /**
     * The refund of one payment. A refund still in flight is kept and handed
     * back, so leaving the screen never stops it being re-sent with its key.
     */
    refundFor(payment: Payment, draft?: RefundDraft): RefundController {
      const current = refunds.get(payment.id);
      if (current && refundInFlight(current)) return current;
      current?.dispose();
      const refund = new RefundController(
        { refunds: zahln.refunds, payments: zahln.payments, ids: cryptoIds, clock: systemClock, timers: systemTimers, telemetry },
        payment,
        draft,
      );
      refunds.set(payment.id, refund);
      return refund;
    },
  } as const;
}

export type Container = ReturnType<typeof createContainer>;
