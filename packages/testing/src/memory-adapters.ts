import type { PaymentIntentStore } from '@zahln/application';
import type { PaymentIntent } from '@zahln/domain';

/** In-memory intent store for tests and for the dashboard, which never pays. */
export function createMemoryIntentStore(): PaymentIntentStore & { size(): number } {
  const intents = new Map<string, PaymentIntent>();
  return {
    save: async (intent) => void intents.set(intent.idempotencyKey, intent),
    get: async (key) => intents.get(key) ?? null,
    listUnsettled: async () => [...intents.values()],
    remove: async (key) => void intents.delete(key),
    size: () => intents.size,
  };
}
