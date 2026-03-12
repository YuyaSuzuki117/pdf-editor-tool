import { describe, expect, it } from 'vitest';
import { parsePageRange } from '@/lib/page-range';

describe('parsePageRange', () => {
  it('parses comma-separated pages and ranges', () => {
    expect(parsePageRange('1-3, 5, 7-8', 10)).toEqual([0, 1, 2, 4, 6, 7]);
  });

  it('deduplicates and sorts overlapping ranges', () => {
    expect(parsePageRange('3, 2-4, 4-2', 10)).toEqual([1, 2, 3]);
  });

  it('clips values outside the document and ignores invalid tokens', () => {
    expect(parsePageRange('0, 2-99, x, 4-', 5)).toEqual([1, 2, 3, 4]);
  });
});
