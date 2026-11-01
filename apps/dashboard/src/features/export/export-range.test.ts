import { describe, expect, it } from 'vitest';

import { MAX_EXPORT_DAYS, presetRange, rangeProblem } from './export-range';

const today = '2026-10-26';

describe('export ranges', () => {
  it('turns presets into days', () => {
    expect(presetRange('yesterday', today)).toEqual({ first: '2026-10-25', last: '2026-10-25' });
    expect(presetRange('last7', today)).toEqual({ first: '2026-10-20', last: today });
    expect(presetRange('thisMonth', today)).toEqual({ first: '2026-10-01', last: today });
  });

  it('accepts a custom range up to today, up to a month long', () => {
    expect(rangeProblem({ first: '2026-10-01', last: '2026-10-01' }, today)).toBeNull();
    expect(rangeProblem({ first: '2026-09-26', last: today }, today)).toBeNull();
    expect(MAX_EXPORT_DAYS).toBe(31);
  });

  it('says what is wrong with a custom range', () => {
    expect(rangeProblem({ first: '', last: today }, today)).toBe('missing');
    expect(rangeProblem({ first: '2026-10-10', last: '2026-10-09' }, today)).toBe('order');
    expect(rangeProblem({ first: '2026-10-20', last: '2026-10-27' }, today)).toBe('future');
    expect(rangeProblem({ first: '2026-09-25', last: today }, today)).toBe('tooLong');
  });

  it('is never longer than the longest preset', () => {
    const month = presetRange('thisMonth', '2026-10-31');
    expect(rangeProblem(month, '2026-10-31')).toBeNull();
  });
});
