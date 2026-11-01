import type { AuthenticationResult, Authenticator } from '@zahln/application';
import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Fingerprint or face, without the device passcode: when biometrics can't be
 * used, the app's own PIN takes over, so the student always confirms with
 * something only they know or are.
 */
export function createAuthenticator(): Authenticator {
  return {
    async isAvailable() {
      const [hardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
      return hardware && enrolled;
    },
    async authenticate({ title, cancelLabel }) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: title,
        cancelLabel,
        disableDeviceFallback: true,
        fallbackLabel: '',
      });
      return result.success ? 'authorized' : toResult(result.error);
    },
  };
}

function toResult(error: string): AuthenticationResult {
  switch (error) {
    case 'lockout':
      return 'locked_out';
    case 'not_enrolled':
    case 'not_available':
    case 'passcode_not_set':
      return 'unavailable';
    default:
      // user_cancel, system_cancel, user_fallback, authentication_failed, …: the student can try again or use the PIN.
      return 'cancelled';
  }
}
