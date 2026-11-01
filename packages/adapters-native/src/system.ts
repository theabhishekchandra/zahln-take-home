import type { Clock, Hasher, IdGenerator, Timers } from '@zahln/application';
import * as Crypto from 'expo-crypto';

export const systemClock: Clock = { now: () => new Date() };

export const systemTimers: Timers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export const cryptoIds: IdGenerator = { uuid: () => Crypto.randomUUID() };

export const cryptoHasher: Hasher = {
  sha256: (text) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text),
};
