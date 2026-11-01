/**
 * Rules for the app PIN that confirms payments when biometrics can't be used.
 * Pure: storing and hashing the PIN happens in the application layer.
 */
export const PIN_LENGTH = 4;
export const PIN_MAX_ATTEMPTS = 3;
export const PIN_LOCK_MS = 5 * 60_000;

export type PinProblem =
  | 'length'
  /** Four of the same digit, like 1111. */
  | 'repeated'
  /** A run, like 1234 or 9876. */
  | 'sequence';

export function pinProblem(pin: string): PinProblem | null {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return 'length';
  const digits = [...pin].map(Number);
  if (digits.every((d) => d === digits[0])) return 'repeated';
  const steps = digits.slice(1).map((d, i) => d - digits[i]!);
  if (steps.every((s) => s === 1) || steps.every((s) => s === -1)) return 'sequence';
  return null;
}

/** Wrong tries so far. Persisted, so restarting the app does not reset a lock. */
export interface PinAttempts {
  readonly failures: number;
  readonly lockedUntil: string | null;
}

export const noPinAttempts: PinAttempts = { failures: 0, lockedUntil: null };

/** The time the lock ends, or null if the PIN can be tried now. */
export function pinLockedUntil(attempts: PinAttempts, now: Date): Date | null {
  if (!attempts.lockedUntil) return null;
  const until = new Date(attempts.lockedUntil);
  return until.getTime() > now.getTime() ? until : null;
}

export function pinAttemptsLeft(attempts: PinAttempts, now: Date): number {
  if (pinLockedUntil(attempts, now)) return 0;
  // A lock that has run out gives a fresh set of tries.
  return attempts.lockedUntil ? PIN_MAX_ATTEMPTS : PIN_MAX_ATTEMPTS - attempts.failures;
}

export function recordPinFailure(attempts: PinAttempts, now: Date): PinAttempts {
  if (pinLockedUntil(attempts, now)) return attempts;
  const failures = (attempts.lockedUntil ? 0 : attempts.failures) + 1;
  return failures >= PIN_MAX_ATTEMPTS
    ? { failures, lockedUntil: new Date(now.getTime() + PIN_LOCK_MS).toISOString() }
    : { failures, lockedUntil: null };
}
