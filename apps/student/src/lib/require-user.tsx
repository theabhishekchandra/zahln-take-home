import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { useAccount } from './account';

/** Screens after sign-in. After a reload without a user, start again at the picker. */
export function RequireUser({ children }: { readonly children: ReactNode }) {
  const { user } = useAccount();
  return user ? children : <Redirect href="/" />;
}
