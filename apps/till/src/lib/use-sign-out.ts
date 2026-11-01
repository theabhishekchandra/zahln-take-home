import { router } from 'expo-router';

import { useDependencies } from './dependencies';
import { useShift } from './shift';

/** Back to sign-in. Work still open at this till is kept for when it's opened again. */
export function useSignOut(): () => void {
  const { signOut } = useDependencies();
  const [, setShift] = useShift();
  return () => {
    signOut();
    setShift(null);
    router.replace('/');
  };
}
