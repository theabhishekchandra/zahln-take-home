import type { MensaId, TillId, UserId } from './ids';
import type { PriceGroup } from './pricing';

export type Role = 'student' | 'staff' | 'guest' | 'cashier' | 'finance';

/** Who is logged in. Payers have a price group; a cashier works at exactly one till. */
export interface User {
  readonly id: UserId;
  readonly name: string;
  readonly role: Role;
  readonly priceGroup: PriceGroup | null;
  readonly tillId: TillId | null;
  readonly mensaId: MensaId | null;
}
