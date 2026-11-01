import { describe, expect, it } from 'vitest';

import { noPinAttempts, pinAttemptsLeft, pinLockedUntil, pinProblem, recordPinFailure, PIN_LOCK_MS } from './pin';

describe('pinProblem', () => {
  it.each([
    ['2580', null],
    ['1111', 'repeated'],
    ['1234', 'sequence'],
    ['9876', 'sequence'],
    ['123', 'length'],
    ['12a4', 'length'],
    ['12345', 'length'],
  ])('%s → %s', (pin, problem) => {
    expect(pinProblem(pin)).toBe(problem);
  });
});

describe('PIN attempts', () => {
  const t0 = new Date('2026-10-30T12:00:00Z');
  const later = (ms: number) => new Date(t0.getTime() + ms);

  it('allows three tries, then locks for five minutes', () => {
    let attempts = noPinAttempts;
    expect(pinAttemptsLeft(attempts, t0)).toBe(3);
    attempts = recordPinFailure(attempts, t0);
    attempts = recordPinFailure(attempts, t0);
    expect(pinAttemptsLeft(attempts, t0)).toBe(1);
    attempts = recordPinFailure(attempts, t0);
    expect(pinLockedUntil(attempts, t0)).toEqual(later(PIN_LOCK_MS));
    expect(pinAttemptsLeft(attempts, later(PIN_LOCK_MS - 1))).toBe(0);
  });

  it('does not extend the lock while locked', () => {
    const locked = recordPinFailure(recordPinFailure(recordPinFailure(noPinAttempts, t0), t0), t0);
    expect(recordPinFailure(locked, later(1000))).toBe(locked);
  });

  it('gives a fresh set of tries once the lock runs out', () => {
    const locked = recordPinFailure(recordPinFailure(recordPinFailure(noPinAttempts, t0), t0), t0);
    const after = later(PIN_LOCK_MS);
    expect(pinLockedUntil(locked, after)).toBeNull();
    expect(pinAttemptsLeft(locked, after)).toBe(3);
    expect(pinAttemptsLeft(recordPinFailure(locked, after), after)).toBe(2);
  });
});
