import { describe, expect, it } from 'vitest';
import { readBoolean, readBranding, readDimensions, readNumber, readOutputFormat, readString } from './readField.js';

describe('readOutputFormat', () => {
  it('returns the value when it is a valid format', () => {
    expect(readOutputFormat({ outputFormat: 'svg' })).toBe('svg');
  });
  it('returns undefined for an invalid or missing format', () => {
    expect(readOutputFormat({ outputFormat: 'bmp' })).toBeUndefined();
    expect(readOutputFormat({})).toBeUndefined();
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

describe('readString', () => {
  it('returns a string', () => {
    expect(readString({ mockupType: 'phone' }, 'mockupType')).toBe('phone');
  });
  it('returns undefined for non-strings', () => {
    expect(readString({ mockupType: 5 }, 'mockupType')).toBeUndefined();
  });
});

describe('readBoolean', () => {
  it('returns a boolean', () => {
    expect(readBoolean({ doubleSided: true }, 'doubleSided')).toBe(true);
    expect(readBoolean({ doubleSided: false }, 'doubleSided')).toBe(false);
  });
  it('returns undefined for non-booleans', () => {
    expect(readBoolean({ doubleSided: 'yes' }, 'doubleSided')).toBeUndefined();
  });
});

describe('readDimensions', () => {
  it('returns dimensions when width/height are numbers', () => {
    expect(readDimensions({ dimensions: { width: 100, height: 200 } })).toEqual({ width: 100, height: 200 });
  });
  it('includes unit when present', () => {
    expect(readDimensions({ dimensions: { width: 8.5, height: 11, unit: 'in' } })).toEqual({
      width: 8.5,
      height: 11,
      unit: 'in',
    });
  });
  it('returns undefined when dimensions is missing or malformed', () => {
    expect(readDimensions({})).toBeUndefined();
    expect(readDimensions({ dimensions: { width: 'wide', height: 200 } })).toBeUndefined();
    expect(readDimensions({ dimensions: null })).toBeUndefined();
  });
});

describe('readBranding', () => {
  it('returns whichever fields are present', () => {
    expect(readBranding({ branding: { brandName: 'Acme', colors: ['#000000'] } })).toEqual({
      brandName: 'Acme',
      colors: ['#000000'],
    });
  });

  it('filters non-string entries out of colors/fonts arrays', () => {
    expect(readBranding({ branding: { colors: ['#000000', 5, '#FFFFFF'] } })).toEqual({
      colors: ['#000000', '#FFFFFF'],
    });
  });

  it('returns undefined when branding is missing, null, or entirely empty', () => {
    expect(readBranding({})).toBeUndefined();
    expect(readBranding({ branding: null })).toBeUndefined();
    expect(readBranding({ branding: {} })).toBeUndefined();
  });
});
