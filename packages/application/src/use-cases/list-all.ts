import type { Payment } from '@zahln/domain';

import type { Outcome } from '../gateway-error';
import type { PaymentQuery, PaymentsPort } from '../ports';
import { ok } from '../result';

const PAGE_SIZE = 100;

/** Every payment matching `query`, following the server's pages. */
export async function listAllPayments(payments: PaymentsPort, query: Omit<PaymentQuery, 'cursor' | 'limit'>): Promise<Outcome<readonly Payment[]>> {
  const all: Payment[] = [];
  let cursor: string | undefined;
  do {
    const page = await payments.list({ ...query, cursor, limit: PAGE_SIZE });
    if (!page.ok) return page;
    all.push(...page.value.items);
    cursor = page.value.nextCursor ?? undefined;
  } while (cursor);
  return ok(all);
}
