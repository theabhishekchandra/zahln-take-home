import { describe, expect, it } from 'vitest';

import { dayPart, firstName, initials } from './people';

describe('dayPart', () => {
  // October 2026 is summer time in Berlin: UTC+2.
  it('follows the Berlin clock', () => {
    expect(dayPart(new Date('2026-10-20T03:00:00Z'))).toBe('morning');
    expect(dayPart(new Date('2026-10-20T09:59:00Z'))).toBe('morning');
    expect(dayPart(new Date('2026-10-20T10:00:00Z'))).toBe('afternoon');
    expect(dayPart(new Date('2026-10-20T16:00:00Z'))).toBe('evening');
  });

  it('says evening after midnight, before five', () => {
    expect(dayPart(new Date('2026-10-20T00:30:00Z'))).toBe('evening');
  });
});

describe('names', () => {
  it('takes the first name', () => {
    expect(firstName('  Sabine Becker ')).toBe('Sabine');
    expect(firstName('')).toBe('');
  });

  it('makes initials from the first and last word', () => {
    expect(initials('Sabine Maria Becker')).toBe('SB');
    expect(initials('finance')).toBe('F');
    expect(initials(' ')).toBe('');
  });
});
