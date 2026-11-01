import {
  asIdempotencyKey,
  isSettled,
  type NotPaidReason,
  type Payment,
  type PaymentIntent,
  type PayFlowEvent,
  type Quote,
  type UserId,
} from '@zahln/domain';

import type { GatewayError, Outcome } from '../gateway-error';
import type { Clock, IdGenerator, PaymentIntentStore, PaymentsPort, Telemetry } from '../ports';

export interface PayDeps {
  readonly payments: PaymentsPort;
  readonly intents: PaymentIntentStore;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly telemetry: Telemetry;
  /**
   * Who is signed in now. Zahln scopes idempotency keys per user, so an intent
   * sent under someone else's login would be a new payment by the wrong payer.
   */
  readonly signedInAs: () => UserId | null;
}

/** Called after biometrics succeed. The idempotency key is created here, exactly once. */
export function createPaymentIntent(deps: Pick<PayDeps, 'ids' | 'clock'>, userId: UserId, quote: Quote): PaymentIntent {
  return {
    idempotencyKey: asIdempotencyKey(deps.ids.uuid()),
    userId,
    quote,
    createdAt: deps.clock.now().toISOString(),
  };
}

/**
 * Saves the intent on the device, then submits it. The order matters: if the
 * app dies after the request leaves, the saved intent is how we find out what
 * happened. Returns the pay-flow event that describes what is now known.
 */
export async function submitPayment(deps: PayDeps, intent: PaymentIntent): Promise<PayFlowEvent> {
  if (deps.signedInAs() !== intent.userId) return { type: 'submitRejected', reason: 'session_expired' };
  await deps.intents.save(intent);
  return settle(deps, intent, await deps.payments.submit(intent), { replay: false });
}

/**
 * Finds out what happened to an intent whose outcome is unknown. Safe to call
 * any number of times, from any screen, after any restart.
 *
 * Once the payment is known it is read by ID. Before that, the intent is sent
 * again with the same key: Zahln returns the payment that key made, or, if the
 * key never reached it, handles it as the first attempt. It never pays twice.
 */
export async function reconcilePayment(deps: PayDeps, intent: PaymentIntent, known?: Payment): Promise<PayFlowEvent> {
  // Only its own payer may send or read it; until they are signed in again it stays open.
  if (deps.signedInAs() !== intent.userId) return { type: 'outcomeUnknown' };
  if (known) {
    const read = await deps.payments.get(known.id);
    return read.ok ? settle(deps, intent, read, { replay: true }) : unknown(deps, intent, read.error);
  }
  return settle(deps, intent, await deps.payments.submit(intent), { replay: true });
}

/** Runs on app start, on return to the foreground and when the network comes back. */
export async function reconcileUnsettledPayments(
  deps: PayDeps,
): Promise<readonly { readonly intent: PaymentIntent; readonly event: PayFlowEvent }[]> {
  const results = [];
  for (const intent of await unsettledFor(deps)) {
    results.push({ intent, event: await reconcilePayment(deps, intent) });
  }
  return results;
}

/** The signed-in payer's intents whose outcome is not known yet. */
export async function unsettledFor(deps: Pick<PayDeps, 'intents' | 'signedInAs'>): Promise<readonly PaymentIntent[]> {
  const me = deps.signedInAs();
  return (await deps.intents.listUnsettled()).filter((intent) => intent.userId === me);
}

async function settle(deps: PayDeps, intent: PaymentIntent, result: Outcome<Payment>, { replay }: { replay: boolean }): Promise<PayFlowEvent> {
  if (result.ok) {
    if (isSettled(result.value.status)) await deps.intents.remove(intent.idempotencyKey);
    return { type: 'paymentUpdated', payment: result.value };
  }
  const { error } = result;
  // A first attempt that was provably not processed paid nothing. A repeat
  // proves that only when Zahln refuses it outright: its key would otherwise
  // have returned the payment. "Offline" or "busy" on a repeat proves nothing.
  if (error.kind === 'not_processed' && (!replay || error.cause === 'rejected')) {
    // Forget the intent so it can never be sent again after the student has
    // been told they did not pay.
    await deps.intents.remove(intent.idempotencyKey);
    return { type: 'submitRejected', reason: notPaidReason(error) };
  }
  return unknown(deps, intent, error);
}

function unknown(deps: PayDeps, intent: PaymentIntent, error: GatewayError): PayFlowEvent {
  deps.telemetry.event('payment.outcome_unknown', { idempotencyKey: intent.idempotencyKey, cause: error.cause });
  return { type: 'outcomeUnknown' };
}

/** Zahln's refusal codes, in the student's terms. */
const REFUSALS: Readonly<Record<string, NotPaidReason>> = {
  not_found: 'order_not_found',
  order_expired: 'quote_expired',
  order_already_paid: 'order_already_paid',
  order_payment_in_progress: 'payment_in_progress',
  amount_mismatch: 'price_changed',
  payments_disabled: 'payments_disabled',
  app_version_unsupported: 'update_required',
};

/** What the student is told when the server provably did nothing with a request. */
export function notPaidReason(error: Extract<GatewayError, { kind: 'not_processed' }>): NotPaidReason {
  switch (error.cause) {
    case 'offline':
      return 'offline';
    case 'unauthorized':
      return 'session_expired';
    case 'rate_limited':
    case 'unavailable':
      return 'server_busy';
    case 'rejected':
      return (error.code && REFUSALS[error.code]) || 'rejected';
  }
}
