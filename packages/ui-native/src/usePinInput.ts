import { PIN_LENGTH } from '@zahln/domain';
import { useLayoutEffect, useRef, useState } from 'react';

/** What the caller can do with four entered digits. */
export interface PinInputControls {
  /** Wrong or weak PIN: empty the dots, show them red and shake once. */
  reject(): void;
  clear(): void;
}

/**
 * Digits typed on the PIN pad. Calls `onComplete` once four digits are in;
 * the pad is locked until it returns. Without `onComplete` the caller submits
 * `digits` itself, e.g. from a button.
 *
 * Taps can arrive faster than the screen re-renders (a busy JS thread, a slow
 * phone), so the entry and the callback live in refs: every tap builds on the
 * digits typed so far, and the latest `onComplete` decides, never a stale one.
 */
export function usePinInput(onComplete?: (pin: string, controls: PinInputControls) => void | Promise<void>) {
  const [digits, setDigits] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const entered = useRef('');
  const locked = useRef(false);
  const complete = useRef(onComplete);
  useLayoutEffect(() => {
    complete.current = onComplete;
  });

  const set = (next: string) => {
    entered.current = next;
    setDigits(next);
  };

  const controls: PinInputControls = {
    reject: () => {
      set('');
      setError(true);
    },
    clear: () => set(''),
  };

  const add = (digit: string) => {
    if (locked.current || entered.current.length >= PIN_LENGTH) return;
    const next = entered.current + digit;
    setError(false);
    set(next);
    const onFull = complete.current;
    if (next.length === PIN_LENGTH && onFull) {
      locked.current = true;
      setBusy(true);
      Promise.resolve(onFull(next, controls)).finally(() => {
        locked.current = false;
        setBusy(false);
      });
    }
  };

  return {
    digits,
    error,
    busy,
    add,
    remove: () => {
      if (!locked.current) set(entered.current.slice(0, -1));
    },
    complete: digits.length === PIN_LENGTH,
    ...controls,
  } as const;
}
