import type { SecureStorage } from '@zahln/application';
import * as SecureStore from 'expo-secure-store';

/** Keychain (iOS) / Keystore (Android). Never synced or backed up to other devices. */
export function createSecureStorage(): SecureStorage {
  const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
  return {
    get: (key) => SecureStore.getItemAsync(key, options),
    set: (key, value) => SecureStore.setItemAsync(key, value, options),
    delete: (key) => SecureStore.deleteItemAsync(key, options),
  };
}
