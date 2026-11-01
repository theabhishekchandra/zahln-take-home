import {
  noPinAttempts,
  pinAttemptsLeft,
  pinLockedUntil,
  pinProblem,
  recordPinFailure,
  type PinAttempts,
  type PinProblem,
} from '@zahln/domain';

import type { Clock, Hasher, IdGenerator, SecureStorage } from '../ports';
import { err, ok, type Result } from '../result';

export interface PinDeps {
  readonly storage: SecureStorage;
  readonly hasher: Hasher;
  readonly ids: IdGenerator;
  readonly clock: Clock;
}

const PIN_KEY = 'zahln.pin.v1';
const ATTEMPTS_KEY = 'zahln.pin.attempts.v1';

interface StoredPin {
  readonly salt: string;
  readonly hash: string;
}

export type PinCheck =
  | { readonly result: 'correct' }
  | { readonly result: 'wrong'; readonly attemptsLeft: number }
  | { readonly result: 'locked'; readonly until: Date }
  | { readonly result: 'not_set' };

/*
 * The PIN is checked on the device: a salted SHA-256 in the Keychain/Keystore
 * (this device only) plus a persisted lock after 3 wrong tries. A 4-digit PIN's
 * hash can be brute-forced by anyone who extracts it, so the protection is the
 * secure storage and the lock, not the hash. In production the server should
 * verify the PIN and own the lock.
 */

export async function hasPin(deps: PinDeps): Promise<boolean> {
  return (await deps.storage.get(PIN_KEY)) !== null;
}

export async function setPin(deps: PinDeps, pin: string): Promise<Result<void, PinProblem>> {
  const problem = pinProblem(pin);
  if (problem) return err(problem);
  const salt = deps.ids.uuid();
  const stored: StoredPin = { salt, hash: await deps.hasher.sha256(`${salt}:${pin}`) };
  await deps.storage.set(PIN_KEY, JSON.stringify(stored));
  await deps.storage.delete(ATTEMPTS_KEY);
  return ok(undefined);
}

export async function verifyPin(deps: PinDeps, pin: string): Promise<PinCheck> {
  const raw = await deps.storage.get(PIN_KEY);
  if (!raw) return { result: 'not_set' };
  const now = deps.clock.now();
  const attempts = await readAttempts(deps);
  const until = pinLockedUntil(attempts, now);
  if (until) return { result: 'locked', until };

  const stored = JSON.parse(raw) as StoredPin;
  if ((await deps.hasher.sha256(`${stored.salt}:${pin}`)) === stored.hash) {
    await deps.storage.delete(ATTEMPTS_KEY);
    return { result: 'correct' };
  }
  const next = recordPinFailure(attempts, now);
  await deps.storage.set(ATTEMPTS_KEY, JSON.stringify(next));
  const lockedUntil = pinLockedUntil(next, now);
  return lockedUntil ? { result: 'locked', until: lockedUntil } : { result: 'wrong', attemptsLeft: pinAttemptsLeft(next, now) };
}

/** For showing "2 attempts left" or the lock before the student types anything. */
export async function pinStatus(deps: PinDeps): Promise<{ readonly attemptsLeft: number; readonly lockedUntil: Date | null }> {
  const attempts = await readAttempts(deps);
  const now = deps.clock.now();
  return { attemptsLeft: pinAttemptsLeft(attempts, now), lockedUntil: pinLockedUntil(attempts, now) };
}

export async function clearPin(deps: PinDeps): Promise<void> {
  await deps.storage.delete(PIN_KEY);
  await deps.storage.delete(ATTEMPTS_KEY);
}

async function readAttempts(deps: PinDeps): Promise<PinAttempts> {
  const raw = await deps.storage.get(ATTEMPTS_KEY);
  return raw ? (JSON.parse(raw) as PinAttempts) : noPinAttempts;
}
