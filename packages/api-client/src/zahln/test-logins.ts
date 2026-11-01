import type { Credentials } from '@zahln/application';
import { asMensaId, asTillId, type MensaId, type PriceGroup, type TillId } from '@zahln/domain';

/**
 * Zahln's seeded test logins, as its API spec lists them. Every password is
 * the same. Test environment only: a real app never ships credentials.
 */
export const TEST_PASSWORD = 'test1234';

export const payerLogin = (group: PriceGroup): Credentials => ({ username: group, password: TEST_PASSWORD });

export interface CashierLogin extends Credentials {
  readonly tillId: TillId;
  readonly mensaId: MensaId;
  readonly mensaName: string;
  /** As the server names the till. */
  readonly tillName: string;
}

const cashier = (username: string, tillId: string, mensaId: string, mensaName: string, tillName: string): CashierLogin => ({
  username,
  password: TEST_PASSWORD,
  tillId: asTillId(tillId),
  mensaId: asMensaId(mensaId),
  mensaName,
  tillName,
});

/** One login per till: signing in at a till means logging in as its cashier. */
export const CASHIER_LOGINS: readonly CashierLogin[] = [
  cashier('cashier-campus-1', 'till_campus_1', 'mensa_campus', 'Mensa am Campus', 'Kasse 1'),
  cashier('cashier-campus-2', 'till_campus_2', 'mensa_campus', 'Mensa am Campus', 'Kasse 2'),
  cashier('cashier-campus-3', 'till_campus_3', 'mensa_campus', 'Mensa am Campus', 'Kasse 3'),
  cashier('cashier-nord-1', 'till_nord_1', 'mensa_nord', 'Mensa Nord', 'Kasse 1'),
  cashier('cashier-nord-2', 'till_nord_2', 'mensa_nord', 'Mensa Nord', 'Kasse 2'),
  cashier('cashier-bibliothek-1', 'till_bibliothek_1', 'cafe_bibliothek', 'Cafeteria Bibliothek', 'Kasse 1'),
];

export const FINANCE_LOGIN: Credentials = { username: 'finance', password: TEST_PASSWORD };
