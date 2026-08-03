import { describe, expect, it } from 'vitest';
import { readNumber, readString, readStringArray } from './readField.js';

describe('readString', () => {
  it('returns the value when it is a string', () => {
    expect(readString({ x: 'a' }, 'x')).toBe('a');
  });
  it('returns undefined for non-strings or missing keys', () => {
    expect(readString({ x: 1 }, 'x')).toBeUndefined();
    expect(readString({}, 'x')).toBeUndefined();
  });
});

describe('readNumber', () => {
  it('returns the value when it is a finite number', () => {
    expect(readNumber({ x: 5 }, 'x')).toBe(5);
  });
  it('returns undefined for non-numbers and non-finite numbers', () => {
    expect(readNumber({ x: '5' }, 'x')).toBeUndefined();
    expect(readNumber({ x: NaN }, 'x')).toBeUndefined();
    expect(readNumber({ x: Infinity }, 'x')).toBeUndefined();
  });
});

describe('readStringArray', () => {
  it('returns only the string elements of an array', () => {
    expect(readStringArray({ x: ['a', 1, 'b'] }, 'x')).toEqual(['a', 'b']);
  });
  it('returns undefined for non-arrays or missing keys', () => {
    expect(readStringArray({ x: 'a' }, 'x')).toBeUndefined();
    expect(readStringArray({}, 'x')).toBeUndefined();
  });
});
