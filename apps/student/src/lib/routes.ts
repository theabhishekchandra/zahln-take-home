import type { PaymentId } from '@zahln/domain';
import { router } from 'expo-router';

/** Screen 17, from any list or banner that shows a payment. */
export function openReceipt(paymentId: PaymentId): void {
  router.push({ pathname: '/receipt/[id]', params: { id: paymentId } });
}
