import { describe, expect, it } from 'vitest';

import { formatFileSize, utf8Bytes } from './file-size';

describe('file size', () => {
  it('counts UTF-8 bytes, as the download is saved', () => {
    expect(utf8Bytes('abc')).toBe(3);
    expect(utf8Bytes('\uFEFFSüd')).toBe(3 + 1 + 2 + 1);
  });

  it('rounds to KB, never below 1 KB', () => {
    expect(formatFileSize(10, 'en')).toBe('1 KB');
    expect(formatFileSize(96 * 1024 + 300, 'en')).toBe('96 KB');
  });

  it('uses MB with one decimal, in the reader’s format', () => {
    expect(formatFileSize(1.25 * 1024 * 1024, 'en')).toBe('1.3 MB');
    expect(formatFileSize(1.25 * 1024 * 1024, 'de')).toBe('1,3 MB');
  });
});
