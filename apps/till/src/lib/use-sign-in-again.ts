import { useDependencies } from './dependencies';
import { useShift, useSignedInShift } from './shift';

/**
 * Logs in as this till's cashier again after the session couldn't be renewed
 * by itself (T9). Paused work carries on; `onRenewed` resumes anything else.
 */
export function useSignInAgain(onRenewed?: () => void): () => Promise<boolean> {
  const { openTill } = useDependencies();
  const shift = useSignedInShift();
  const [, setShift] = useShift();
  return async () => {
    const result = await openTill(shift.login);
    if (!result.ok) return false;
    setShift({ ...shift, cashier: result.value });
    onRenewed?.();
    return true;
  };
}
