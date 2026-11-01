import { describe, expect, it } from 'vitest';

import { createTelemetry, redact, type LogRecord } from './telemetry';

describe('redact', () => {
  it('hides credentials at any depth', () => {
    expect(redact({ accessToken: 'x', nested: { pin: '1234', ok: 1 }, list: [{ Authorization: 'b' }] })).toEqual({
      accessToken: '[redacted]',
      nested: { pin: '[redacted]', ok: 1 },
      list: [{ Authorization: '[redacted]' }],
    });
  });
});

describe('createTelemetry', () => {
  it('sends redacted records to every sink and survives a failing sink', () => {
    const records: LogRecord[] = [];
    const telemetry = createTelemetry({
      context: { app: 'student' },
      sinks: [
        () => {
          throw new Error('sink down');
        },
        (r) => records.push(r),
      ],
      now: () => new Date('2026-10-30T12:00:00.000Z'),
    });
    telemetry.event('payment.submitted', { idempotencyKey: 'k', sessionToken: 's' });
    expect(records[0]).toMatchObject({
      name: 'payment.submitted',
      context: { app: 'student' },
      properties: { idempotencyKey: 'k', sessionToken: '[redacted]' },
    });
  });
});
