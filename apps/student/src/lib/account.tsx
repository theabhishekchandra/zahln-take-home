import { payerLogin } from '@zahln/api-client';
import type { PriceGroup, User } from '@zahln/domain';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { useDependencies } from './dependencies';

/** A signed-in payer: one of Zahln's seeded student, staff and guest logins. */
export interface Payer extends User {
  readonly priceGroup: PriceGroup;
}

interface Account {
  readonly user: Payer | null;
  /** Logs in as the seeded user of this price group. False if Zahln refused or couldn't be reached. */
  signIn(group: PriceGroup): Promise<boolean>;
  signOut(): void;
}

const AccountContext = createContext<Account | null>(null);

export function AccountProvider({ children }: { readonly children: ReactNode }) {
  const { session } = useDependencies();
  const [user, setUser] = useState<Payer | null>(null);
  const account = useMemo<Account>(
    () => ({
      user,
      async signIn(group) {
        const result = await session.signIn(payerLogin(group));
        const { priceGroup } = result.ok ? result.value : { priceGroup: null };
        if (!result.ok || !priceGroup) return false;
        setUser({ ...result.value, priceGroup });
        return true;
      },
      signOut() {
        session.signOut();
        setUser(null);
      },
    }),
    [session, user],
  );
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}

export function useAccount(): Account {
  const account = useContext(AccountContext);
  if (!account) throw new Error('useAccount must be used inside <AccountProvider>');
  return account;
}

/** The signed-in payer, for screens that are only reachable after signing in. */
export function useSignedInUser(): Payer {
  const { user } = useAccount();
  if (!user) throw new Error('No user signed in');
  return user;
}
