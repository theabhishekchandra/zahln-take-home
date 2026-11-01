import { describe, expect, it } from 'vitest';

import type { AuthenticationResult, SecureStorage } from '../ports';
import { authorizeWithBiometrics, biometricsEnabled, setBiometricsEnabled, type BiometricsDeps } from './biometrics';

function setup({ available = true, result = 'authorized' as AuthenticationResult } = {}) {
  const map = new Map<string, string>();
  const storage: SecureStorage = {
    get: async (key) => map.get(key) ?? null,
    set: async (key, value) => void map.set(key, value),
    delete: async (key) => void map.delete(key),
  };
  let prompts = 0;
  const deps: BiometricsDeps = {
    storage,
    authenticator: { isAvailable: async () => available, authenticate: async () => (prompts++, result) },
  };
  return { deps, prompts: () => prompts };
}

const prompt = { title: 'Confirm payment of €5.30', cancelLabel: 'Use PIN' };

describe('biometrics', () => {
  it('uses the PIN, without prompting, until the student turns biometrics on', async () => {
    const { deps, prompts } = setup();
    expect(await authorizeWithBiometrics(deps, prompt)).toBe('use_pin');
    expect(prompts()).toBe(0);
    await setBiometricsEnabled(deps, true);
    expect(await authorizeWithBiometrics(deps, prompt)).toBe('authorized');
  });

  it('falls back to the PIN when the device can no longer use biometrics', async () => {
    const { deps } = setup({ available: false });
    await setBiometricsEnabled(deps, true);
    expect(await biometricsEnabled(deps)).toBe(false);
    expect(await authorizeWithBiometrics(deps, prompt)).toBe('use_pin');
  });

  it('a lockout goes to the PIN, a cancel stays a cancel', async () => {
    const locked = setup({ result: 'locked_out' });
    await setBiometricsEnabled(locked.deps, true);
    expect(await authorizeWithBiometrics(locked.deps, prompt)).toBe('use_pin');
    const cancelled = setup({ result: 'cancelled' });
    await setBiometricsEnabled(cancelled.deps, true);
    expect(await authorizeWithBiometrics(cancelled.deps, prompt)).toBe('cancelled');
  });
});
