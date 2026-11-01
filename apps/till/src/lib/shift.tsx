import type { CashierLogin } from '@zahln/api-client';
import type { User } from '@zahln/domain';
import { Redirect } from 'expo-router';
import { createContext, useContext, useState, type ReactNode } from 'react';

/** Who is selling at which till. Held in memory: a restarted till is signed in again. */
export interface Shift {
  /** The till's seeded cashier login. */
  readonly login: CashierLogin;
  readonly cashier: User;
}

type ShiftState = readonly [Shift | null, (shift: Shift | null) => void];

const ShiftContext = createContext<ShiftState | null>(null);

export function ShiftProvider({ children }: { readonly children: ReactNode }) {
  const state = useState<Shift | null>(null);
  return <ShiftContext.Provider value={state}>{children}</ShiftContext.Provider>;
}

export function useShift(): ShiftState {
  const state = useContext(ShiftContext);
  if (!state) throw new Error('useShift must be used inside <ShiftProvider>');
  return state;
}

/** The current shift, for screens only reachable after sign-in. */
export function useSignedInShift(): Shift {
  const [shift] = useShift();
  if (!shift) throw new Error('No cashier signed in');
  return shift;
}

/** Screens after sign-in. Without a shift (e.g. after a reload), start again at sign-in. */
export function RequireShift({ children }: { readonly children: ReactNode }) {
  const [shift] = useShift();
  return shift ? children : <Redirect href="/" />;
}
