import type { User } from '@zahln/domain';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { useDependencies } from './dependencies';

export type SignInResult = 'ok' | 'failed' | 'unreachable' | 'not_finance';

interface Auth {
  readonly user: User | null;
  /** True once a session ended and couldn't be renewed: the sign-in page says so. */
  readonly ended: boolean;
  signIn(username: string, password: string): Promise<SignInResult>;
  signOut(): void;
  /** A request was refused as unauthorized even after logging in again. */
  expire(): void;
}

const AuthContext = createContext<Auth | null>(null);

/**
 * The finance session, in memory only: a reload asks to sign in again, so no
 * password or token is ever written to the browser's storage.
 */
export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const { session } = useDependencies();
  const [user, setUser] = useState<User | null>(null);
  const [ended, setEnded] = useState(false);
  const auth = useMemo<Auth>(
    () => ({
      user,
      ended,
      async signIn(username, password) {
        const result = await session.signIn({ username: username.trim(), password });
        if (!result.ok) return result.error.kind === 'not_processed' && result.error.cause === 'unauthorized' ? 'failed' : 'unreachable';
        if (result.value.role !== 'finance') {
          session.signOut();
          return 'not_finance';
        }
        setEnded(false);
        setUser(result.value);
        return 'ok';
      },
      signOut() {
        session.signOut();
        setUser(null);
      },
      expire() {
        session.signOut();
        setUser(null);
        setEnded(true);
      },
    }),
    [session, user, ended],
  );
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>');
  return auth;
}
