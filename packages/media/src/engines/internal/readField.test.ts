import { describe, expect, it } from 'vitest';
import { readEnum, readNumber, readString } from './readField.js';

describe('readString', () => {
  it('returns a string', () => {
    expect(readString({ language: 'en' }, 'language')).toBe('en');
  });
  it('returns undefined for non-strings', () => {
    expect(readString({ language: 5 }, 'language')).toBeUndefined();
  });
});

describe('readNumber', () => {
  it('returns a finite number', () => {
    expect(readNumber({ count: 3 }, 'count')).toBe(3);
  });
  it('returns undefined for non-numbers and non-finite numbers', () => {
    expect(readNumber({ count: '3' }, 'count')).toBeUndefined();
    expect(readNumber({ count: NaN }, 'count')).toBeUndefined();
    expect(readNumber({}, 'count')).toBeUndefined();
  });
});

describe('readEnum', () => {
  it('returns the value when it is in the valid set', () => {
    expect(readEnum({ outputFormat: 'png' }, 'outputFormat', ['png', 'jpg'] as const)).toBe('png');
  });
  it('returns undefined for an invalid or missing value', () => {
    expect(readEnum({ outputFormat: 'bmp' }, 'outputFormat', ['png', 'jpg'] as const)).toBeUndefined();
    expect(readEnum({}, 'outputFormat', ['png', 'jpg'] as const)).toBeUndefined();
  });
});
