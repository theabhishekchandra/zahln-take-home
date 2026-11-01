import {
  asMensaId,
  asOrderId,
  asPaymentId,
  asTillId,
  asUserId,
  money,
  type IdempotencyKey,
  type Payment,
  type PaymentDetail,
  type PaymentIntent,
  type PaymentStatus,
  type Quote,
} from '@zahln/domain';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Outcome } from '../gateway-error';
import type { PaymentIntentStore, PaymentsPort } from '../ports';
import { err, ok } from '../result';
import { createPaymentIntent, reconcilePayment, reconcileUnsettledPayments, submitPayment, type PayDeps } from './pay';

const quote: Quote = {
  orderId: asOrderId('o1'),
  status: 'open',
  mensa: { id: asMensaId('m1'), name: 'Mensa' },
  till: { id: asTillId('t1'), name: 'Kasse 1' },
  priceGroup: 'student',
  lines: [],
  total: money(320),
  paymentId: null,
  expiresAt: '2026-10-30T12:05:00.000Z',
  version: 1,
};

const paymentWith = (status: PaymentStatus, version = 1): PaymentDetail => ({
  id: asPaymentId('p1'),
  orderId: quote.orderId,
  status,
  amount: quote.total,
  priceGroup: 'student',
  mensa: quote.mensa,
  till: quote.till,
  payer: { id: asUserId('u1'), name: 'Test Student' },
  items: [],
  refunded: money(0),
  refundPending: money(0),
  refundable: status === 'confirmed' ? quote.total : money(0),
  needsAttention: false,
  attentionReasons: [],
  version,
  createdAt: '2026-10-30T12:00:00.000Z',
  updatedAt: '2026-10-30T12:00:00.000Z',
  refunds: [],
  history: [],
});

class MemoryIntentStore implements PaymentIntentStore {
  readonly intents = new Map<string, PaymentIntent>();
  async save(intent: PaymentIntent) {
    this.intents.set(intent.idempotencyKey, intent);
  }
  async get(key: IdempotencyKey) {
    return this.intents.get(key) ?? null;
  }
  async listUnsettled() {
    return [...this.intents.values()];
  }
  async remove(key: IdempotencyKey) {
    this.intents.delete(key);
  }
}

/** Answers each call from a script, and records what was sent. */
class ScriptedPayments implements PaymentsPort {
  submits: PaymentIntent[] = [];
  submitReplies: ((intent: PaymentIntent) => Outcome<Payment>)[] = [];
  readReplies: Outcome<PaymentDetail>[] = [];
  savedBeforeSubmit: boolean[] = [];
  private readonly store: MemoryIntentStore;

  constructor(store: MemoryIntentStore) {
    this.store = store;
  }

  async submit(intent: PaymentIntent) {
    this.submits.push(intent);
    this.savedBeforeSubmit.push(this.store.intents.has(intent.idempotencyKey));
    const reply = this.submitReplies.shift();
    if (!reply) throw new Error('unexpected submit');
    return reply(intent);
  }
  async get() {
    const reply = this.readReplies.shift();
    if (!reply) throw new Error('unexpected read');
    return reply;
  }
  list = () => Promise.reject(new Error('not used'));
}

let store: MemoryIntentStore;
let payments: ScriptedPayments;
let deps: PayDeps;
let events: string[];
let intent: PaymentIntent;

beforeEach(() => {
  store = new MemoryIntentStore();
  payments = new ScriptedPayments(store);
  events = [];
  deps = {
    payments,
    intents: store,
    ids: { uuid: () => 'key-1' },
    clock: { now: () => new Date('2026-10-30T12:00:00.000Z') },
    telemetry: { event: (name) => events.push(name), error: () => {} },
    signedInAs: () => asUserId('u1'),
  };
  intent = createPaymentIntent(deps, asUserId('u1'), quote);
});

describe('submitPayment', () => {
  it('saves the intent before sending it, and forgets it once settled', async () => {
    payments.submitReplies.push(() => ok(paymentWith('confirmed', 2)));
    const event = await submitPayment(deps, intent);
    expect(payments.savedBeforeSubmit).toEqual([true]);
    expect(event).toMatchObject({ type: 'paymentUpdated', payment: { status: 'confirmed' } });
    expect(store.intents.size).toBe(0);
  });

  it('keeps the intent when the outcome is unknown', async () => {
    payments.submitReplies.push(() => err({ kind: 'outcome_unknown', cause: 'timeout' }));
    expect(await submitPayment(deps, intent)).toEqual({ type: 'outcomeUnknown' });
    expect(store.intents.has(intent.idempotencyKey)).toBe(true);
    expect(events).toContain('payment.outcome_unknown');
  });

  it('keeps the intent while the payment is still pending', async () => {
    payments.submitReplies.push(() => ok(paymentWith('pending')));
    await submitPayment(deps, intent);
    expect(store.intents.has(intent.idempotencyKey)).toBe(true);
  });

  it('forgets the intent when the server provably did not process it', async () => {
    payments.submitReplies.push(() => err({ kind: 'not_processed', cause: 'rejected', code: 'order_expired', retryable: false }));
    expect(await submitPayment(deps, intent)).toEqual({ type: 'submitRejected', reason: 'quote_expired' });
    expect(store.intents.size).toBe(0);
  });
});

describe('reconcilePayment', () => {
  it('sends the intent again with the same key while no payment is known', async () => {
    payments.submitReplies.push(() => ok(paymentWith('pending', 1)));
    const event = await reconcilePayment(deps, intent);
    expect(event).toMatchObject({ type: 'paymentUpdated', payment: { status: 'pending' } });
    expect(payments.submits.map((i) => i.idempotencyKey)).toEqual([intent.idempotencyKey]);
  });

  it('reads a known payment by ID, never sending again', async () => {
    payments.readReplies.push(ok(paymentWith('confirmed', 3)));
    const event = await reconcilePayment(deps, intent, paymentWith('pending', 1));
    expect(event).toMatchObject({ type: 'paymentUpdated', payment: { status: 'confirmed' } });
    expect(payments.submits).toHaveLength(0);
  });

  it.each([
    ['offline', { kind: 'not_processed', cause: 'offline', retryable: true }],
    ['busy', { kind: 'not_processed', cause: 'unavailable', retryable: true }],
    ['unknown', { kind: 'outcome_unknown', cause: 'timeout' }],
  ] as const)('stays unknown, and keeps the intent, when a repeat is %s: the first may have paid', async (_, error) => {
    await store.save(intent);
    payments.submitReplies.push(() => err(error));
    expect(await reconcilePayment(deps, intent)).toEqual({ type: 'outcomeUnknown' });
    expect(store.intents.has(intent.idempotencyKey)).toBe(true);
  });

  it('a refusal of the repeat proves the key never paid: had it, the payment would have come back', async () => {
    await store.save(intent);
    payments.submitReplies.push(() => err({ kind: 'not_processed', cause: 'rejected', code: 'order_expired', retryable: false }));
    expect(await reconcilePayment(deps, intent)).toEqual({ type: 'submitRejected', reason: 'quote_expired' });
    expect(store.intents.size).toBe(0);
  });

  it('stays unknown when reading a known payment fails', async () => {
    await store.save(intent);
    payments.readReplies.push(err({ kind: 'not_processed', cause: 'offline', retryable: true }));
    expect(await reconcilePayment(deps, intent, paymentWith('pending'))).toEqual({ type: 'outcomeUnknown' });
    expect(store.intents.has(intent.idempotencyKey)).toBe(true);
  });
});

describe('another user signed in', () => {
  it("never sends or reads an intent under someone else's login", async () => {
    await store.save(intent);
    const other = { ...deps, signedInAs: () => asUserId('u2') };
    expect(await reconcilePayment(other, intent)).toEqual({ type: 'outcomeUnknown' });
    expect(await reconcilePayment(other, intent, paymentWith('pending'))).toEqual({ type: 'outcomeUnknown' });
    expect(await reconcileUnsettledPayments(other)).toEqual([]);
    expect(payments.submits).toHaveLength(0);
    expect(store.intents.has(intent.idempotencyKey)).toBe(true);
  });
});

describe('reconcileUnsettledPayments', () => {
  it('checks every saved intent after a restart', async () => {
    await store.save(intent);
    payments.submitReplies.push(() => ok(paymentWith('declined', 2)));
    const results = await reconcileUnsettledPayments(deps);
    expect(results).toHaveLength(1);
    expect(results[0]?.event).toMatchObject({ type: 'paymentUpdated', payment: { status: 'declined' } });
    expect(store.intents.size).toBe(0);
  });
});
