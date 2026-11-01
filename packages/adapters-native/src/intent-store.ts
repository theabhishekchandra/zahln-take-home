import type { PaymentIntentStore } from '@zahln/application';
import type { IdempotencyKey, PaymentIntent } from '@zahln/domain';
import Storage from 'expo-sqlite/kv-store';

const PREFIX = 'payment-intent:';

/**
 * Durable on-device store for payment intents (SQLite). Writes complete before
 * the payment is sent, so an intent survives a crash or force-quit mid-payment.
 * Intents hold no credentials, so they do not need the keychain.
 */
export function createIntentStore(): PaymentIntentStore {
  return {
    async save(intent) {
      await Storage.setItem(PREFIX + intent.idempotencyKey, JSON.stringify(intent));
    },
    async get(key: IdempotencyKey) {
      const raw = await Storage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as PaymentIntent) : null;
    },
    async listUnsettled() {
      const keys = (await Storage.getAllKeys()).filter((key) => key.startsWith(PREFIX));
      const intents = await Promise.all(keys.map((key) => Storage.getItem(key)));
      return intents.flatMap((raw) => (raw ? [JSON.parse(raw) as PaymentIntent] : []));
    },
    async remove(key: IdempotencyKey) {
      await Storage.removeItem(PREFIX + key);
    },
  };
}
