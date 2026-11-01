import type { Clock, IdGenerator } from '@zahln/application';

export const systemClock: Clock = { now: () => new Date() };

export const cryptoIds: IdGenerator = { uuid: () => crypto.randomUUID() };
