import { describe, expect, it } from 'vitest';

import { addDays, businessDay, businessDayRange, businessTime, weekday } from './business-day';

describe('business days in Europe/Berlin', () => {
  it('a late-evening UTC instant already belongs to the next Berlin day', () => {
    expect(businessDay(new Date('2026-10-30T23:30:00Z'))).toBe('2026-10-31');
    expect(businessTime(new Date('2026-10-30T23:30:00Z'))).toBe('00:30');
  });

  it('a summer day starts at 22:00 UTC the day before', () => {
    expect(businessDayRange('2026-07-15')).toEqual({ from: '2026-07-14T22:00:00.000Z', to: '2026-07-15T22:00:00.000Z' });
  });

  it('the day clocks go back has 25 hours', () => {
    expect(businessDayRange('2026-10-25')).toEqual({ from: '2026-10-24T22:00:00.000Z', to: '2026-10-25T23:00:00.000Z' });
  });

  it('the day clocks go forward has 23 hours', () => {
    expect(businessDayRange('2026-03-29')).toEqual({ from: '2026-03-28T23:00:00.000Z', to: '2026-03-29T22:00:00.000Z' });
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(weekday('2026-10-31')).toBe(6);
  });
});
