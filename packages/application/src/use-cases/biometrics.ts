import type { Authenticator, SecureStorage } from '../ports';

export interface BiometricsDeps {
  readonly storage: SecureStorage;
  readonly authenticator: Authenticator;
}

const ENABLED_KEY = 'zahln.biometrics.v1';

/** The student turned biometrics on, and the device can still use them. */
export async function biometricsEnabled(deps: BiometricsDeps): Promise<boolean> {
  return (await deps.storage.get(ENABLED_KEY)) === 'on' && (await deps.authenticator.isAvailable());
}

export async function setBiometricsEnabled(deps: BiometricsDeps, enabled: boolean): Promise<void> {
  if (enabled) await deps.storage.set(ENABLED_KEY, 'on');
  else await deps.storage.delete(ENABLED_KEY);
}

/** `use_pin`: biometrics are off, not set up on this device, or locked out. */
export type Authorization = 'authorized' | 'cancelled' | 'use_pin';

/** Asks for a fingerprint or face if the student uses them; otherwise the PIN screen takes over. */
export async function authorizeWithBiometrics(
  deps: BiometricsDeps,
  prompt: { readonly title: string; readonly cancelLabel: string },
): Promise<Authorization> {
  if (!(await biometricsEnabled(deps))) return 'use_pin';
  const result = await deps.authenticator.authenticate(prompt);
  if (result === 'authorized' || result === 'cancelled') return result;
  return 'use_pin';
}
