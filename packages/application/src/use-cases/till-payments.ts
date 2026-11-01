import type { Payment } from '@zahln/domain';

import type { Outcome } from '../gateway-error';
import type { Clock, PaymentsPort } from '../ports';

import { listAllPayments } from './list-all';

export interface TillPaymentsDeps {
  readonly payments: PaymentsPort;
  readonly clock: Clock;
}

/**
 * Today's payments on the signed-in cashier's till, newest first: what the
 * cashier can refund (design T10). Zahln shows a cashier only their own till.
 */
export function loadTodayOnTill(deps: TillPaymentsDeps): Promise<Outcome<readonly Payment[]>> {
  const now = deps.clock.now();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return listAllPayments(deps.payments, { from: midnight.toISOString() });
}
