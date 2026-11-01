import { AccessibilityInfo } from 'react-native';

/**
 * Speaks a change the user cannot see, e.g. "Paid" after biometrics. Used for
 * payment results so screen-reader users learn the outcome without hunting for it.
 */
export function announce(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}
