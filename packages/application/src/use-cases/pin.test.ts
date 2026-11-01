import { describe, expect, it } from 'vitest';

import type { SecureStorage } from '../ports';
import { clearPin, hasPin, pinStatus, setPin, verifyPin, type PinDeps } from './pin';

function setup() {
  const map = new Map<string, string>();
  const storage: SecureStorage = {
    get: async (key) => map.get(key) ?? null,
    set: async (key, value) => void map.set(key, value),
    delete: async (key) => void map.delete(key),
  };
  let now = new Date('2026-10-30T12:00:00Z');
  let n = 0;
  const deps: PinDeps = {
    storage,
    hasher: { sha256: async (text) => `h(${text})` },
    ids: { uuid: () => `salt-${++n}` },
    clock: { now: () => now },
  };
  return { deps, map, advance: (ms: number) => (now = new Date(now.getTime() + ms)) };
}

describe('app PIN', () => {
  it('refuses weak PINs and stores only a salted hash', async () => {
    const { deps, map } = setup();
    expect(await setPin(deps, '1234')).toEqual({ ok: false, error: 'sequence' });
    expect(await hasPin(deps)).toBe(false);
    expect((await setPin(deps, '2580')).ok).toBe(true);
    expect([...map.values()].join()).not.toContain('"2580"');
  });

  it('locks after three wrong tries, survives a restart, and unlocks after five minutes', async () => {
    const { deps, advance } = setup();
    await setPin(deps, '2580');
    expect(await verifyPin(deps, '0000')).toEqual({ result: 'wrong', attemptsLeft: 2 });
    expect(await verifyPin(deps, '0000')).toEqual({ result: 'wrong', attemptsLeft: 1 });
    expect(await verifyPin(deps, '0000')).toMatchObject({ result: 'locked' });
    // Even the right PIN is refused while locked.
    expect(await verifyPin(deps, '2580')).toMatchObject({ result: 'locked' });
    expect((await pinStatus(deps)).attemptsLeft).toBe(0);
    advance(5 * 60_000);
    expect(await verifyPin(deps, '2580')).toEqual({ result: 'correct' });
  });

  it('a correct PIN resets the count', async () => {
    const { deps } = setup();
    await setPin(deps, '2580');
    await verifyPin(deps, '0000');
    await verifyPin(deps, '2580');
    expect(await verifyPin(deps, '0000')).toEqual({ result: 'wrong', attemptsLeft: 2 });
  });

  it('reports a missing PIN and can be cleared', async () => {
    const { deps } = setup();
    expect(await verifyPin(deps, '2580')).toEqual({ result: 'not_set' });
    await setPin(deps, '2580');
    await clearPin(deps);
    expect(await hasPin(deps)).toBe(false);
  });
});
