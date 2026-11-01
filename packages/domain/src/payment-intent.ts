import type { IdempotencyKey, UserId } from './ids';
import type { Quote } from './order';

/**
 * The student's decision to pay one quote. It is saved on the device before
 * anything is sent, and keeps its idempotency key for every retry and status
 * check, so a crash or a lost response can never turn into a second charge.
 */
export interface PaymentIntent {
  readonly idempotencyKey: IdempotencyKey;
  readonly userId: UserId;
  readonly quote: Quote;
  readonly createdAt: string;
}
