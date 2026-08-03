import { describe, expect, it } from 'vitest';
import { asNumber, asNumberArray, asRecord, asRecordArray, asString, asStringArray } from './coerce.js';

describe('asString', () => {
  it('returns the value when it is a string', () => {
    expect(asString('x')).toBe('x');
  });
  it('returns undefined for non-strings', () => {
    expect(asString(1)).toBeUndefined();
    expect(asString(null)).toBeUndefined();
  });
});

describe('asNumber', () => {
  it('returns the value when it is a finite number', () => {
    expect(asNumber(42)).toBe(42);
  });
  it('returns undefined for non-numbers and non-finite numbers', () => {
    expect(asNumber('42')).toBeUndefined();
    expect(asNumber(NaN)).toBeUndefined();
  });
});

describe('asStringArray', () => {
  it('returns only the string elements of an array', () => {
    expect(asStringArray(['a', 1, 'b', null])).toEqual(['a', 'b']);
  });
  it('returns an empty array for non-arrays', () => {
    expect(asStringArray('x')).toEqual([]);
    expect(asStringArray(undefined)).toEqual([]);
  });
});

describe('asNumberArray', () => {
  it('returns only the finite-number elements of an array', () => {
    expect(asNumberArray([1, 'x', 2, NaN])).toEqual([1, 2]);
  });
  it('returns an empty array for non-arrays', () => {
    expect(asNumberArray('x')).toEqual([]);
  });
});

describe('asRecord', () => {
  it('returns the value when it is a plain object', () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
  });
  it('returns undefined for arrays, null, and non-objects', () => {
    expect(asRecord([1, 2])).toBeUndefined();
    expect(asRecord(null)).toBeUndefined();
    expect(asRecord('x')).toBeUndefined();
  });
});

describe('asRecordArray', () => {
  it('returns only the object elements of an array', () => {
    expect(asRecordArray([{ a: 1 }, 'x', { b: 2 }, null])).toEqual([{ a: 1 }, { b: 2 }]);
  });
  it('returns an empty array for non-arrays', () => {
    expect(asRecordArray('x')).toEqual([]);
  });
});
