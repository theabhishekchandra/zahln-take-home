import {
  createAuthenticator,
  createConnectivity,
  createIntentStore,
  createSecureStorage,
  cryptoHasher,
  cryptoIds,
  systemClock,
  systemTimers,
} from '@zahln/adapters-native';
import { createZahlnApi } from '@zahln/api-client';
import { PaymentWatcher, PayFlowController, type ActivityDeps, type BiometricsDeps, type PinDeps } from '@zahln/application';
import { AppGateWatcher, isServerUrl, resolveZahlnServer, saveServerOverride, storedConfigCache, zahlnServer, type ZahlnServer } from '@zahln/config';
import type { PaymentId } from '@zahln/domain';
import { consoleSink, createTelemetry } from '@zahln/telemetry';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Composition root: the only place that decides which adapter backs each port.
 * Server ports are Zahln's API. Whatever the server lets expire is timed by
 * its clock, learned from its responses (`zahln.clock`), not the device's.
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
    context: { app: 'student', version, platform: Platform.OS },
    sinks: [consoleSink],
  });
  const storage = createSecureStorage();

  const intents = createIntentStore();
  const payFlow = new PayFlowController({
    quotes: zahln.quotes,
    payments: zahln.payments,
    intents,
    ids: cryptoIds,
    clock: systemClock,
    serverClock: zahln.clock,
    timers: systemTimers,
    telemetry,
    signedInAs: () => zahln.session.user?.id ?? null,
  });

  const gate = new AppGateWatcher({ fetchConfig: zahln.config.load, cache: storedConfigCache(storage), timers: systemTimers, appVersion: version });

  return {
    payFlow,
    /** Zahln's kill switch and minimum version. Started by the root layout. */
    gate,
    /** Which server this launch uses, and (in test builds) changing it for the next one. */
    server: {
      current: server.baseUrl,
      buildDefault: zahlnServer(BUILD_SERVER_URL).baseUrl,
      canChange: ALLOW_SERVER_CHANGE,
      isValid: isServerUrl,
      /** Refused while a payment is in doubt: it must settle on the server it was sent to. */
      async save(url: string | null): Promise<'saved' | 'busy'> {
        if ((await intents.listUnsettled()).length > 0) return 'busy';
        await saveServerOverride(storage, url);
        return 'saved';
      },
    },
    session: zahln.session,
    /** Small app settings, such as the chosen language. */
    settings: storage,
    pin: { storage, hasher: cryptoHasher, ids: cryptoIds, clock: systemClock } satisfies PinDeps,
    biometrics: { storage, authenticator: createAuthenticator() } satisfies BiometricsDeps,
    activity: { payments: zahln.payments, clock: systemClock } satisfies ActivityDeps,
    /** Screens 17 and 18: one payment, read again while Zahln is still deciding it. */
    watchPayment: (paymentId: PaymentId) => new PaymentWatcher({ payments: zahln.payments, timers: systemTimers, clock: systemClock }, paymentId),
    /** The server's time in ms, for countdowns to a deadline the server set. */
    serverNow: () => zahln.clock.now().getTime(),
    connectivity,
    telemetry,
    version,
  } as const;
}

export type Container = ReturnType<typeof createContainer>;
