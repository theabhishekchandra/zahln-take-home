import type { Clock } from '@zahln/application';

import type { ServerTimeSample } from '../http-client';

/** How many recent samples to choose the best one from. */
const WINDOW = 8;

/**
 * The server's time, learned from the `Date` header of its responses. Zahln
 * decides when an order expires by its own clock, so countdowns and expiry
 * checks must use it, not the device's, which may be minutes off.
 *
 * `Date` has whole seconds and the network adds delay; of the recent samples,
 * the one with the shortest round trip is the most precise.
 */
export class ServerClock implements Clock {
  private readonly device: () => number;
  private samples: { readonly offsetMs: number; readonly roundTripMs: number }[] = [];
  private offsetMs = 0;

  constructor(device: () => number = Date.now) {
    this.device = device;
  }

  now(): Date {
    return new Date(this.device() + this.offsetMs);
  }

  observe(sample: ServerTimeSample): void {
    const server = Date.parse(sample.date);
    if (Number.isNaN(server)) return;
    const roundTripMs = Math.max(0, sample.receivedAt - sample.sentAt);
    // The header is truncated to the second: on average the true time is half a second later.
    const offsetMs = server + 500 - (sample.sentAt + sample.receivedAt) / 2;
    this.samples = [...this.samples.slice(-(WINDOW - 1)), { offsetMs, roundTripMs }];
    const best = this.samples.reduce((a, b) => (b.roundTripMs < a.roundTripMs ? b : a));
    this.offsetMs = Math.round(best.offsetMs);
  }
}
