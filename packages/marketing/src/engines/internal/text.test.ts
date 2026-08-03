import { describe, expect, it } from 'vitest';
import { addDays, slugify, truncate } from './text.js';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Summer Sale 2026!')).toBe('summer-sale-2026');
  });
  it('falls back to "untitled" when nothing alphanumeric remains', () => {
    expect(slugify('!!!')).toBe('untitled');
  });
});

describe('truncate', () => {
  it('returns the text unchanged when within maxLength', () => {
    expect(truncate('short', 10)).toBe('short');
  });
  it('truncates and appends an ellipsis when over maxLength', () => {
    expect(truncate('a long piece of text', 10)).toBe('a long pi…');
    expect(truncate('a long piece of text', 10).length).toBe(10);
  });
});

describe('addDays', () => {
  it('adds days to an ISO date string, deterministically', () => {
    expect(addDays('2026-01-01', 5)).toBe('2026-01-06');
  });
  it('rolls over month/year boundaries correctly', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
  });
  it('is a pure function — same input always produces the same output', () => {
    expect(addDays('2026-06-15', 10)).toBe(addDays('2026-06-15', 10));
  });
});
