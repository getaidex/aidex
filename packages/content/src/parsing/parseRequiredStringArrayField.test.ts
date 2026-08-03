import { describe, expect, it } from 'vitest';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { parseRequiredStringArrayField } from './parseRequiredStringArrayField.js';

describe('parseRequiredStringArrayField', () => {
  it('returns the array when the field is present and is an array of strings', () => {
    expect(parseRequiredStringArrayField('s', '{"headlines": ["a", "b"]}', 'headlines')).toEqual(['a', 'b']);
  });

  it('filters non-string entries rather than failing', () => {
    expect(parseRequiredStringArrayField('s', '{"headlines": ["a", 1, "b"]}', 'headlines')).toEqual(['a', 'b']);
  });

  it('throws when the field is missing entirely', () => {
    expect(() => parseRequiredStringArrayField('s', '{}', 'headlines')).toThrow(
      UnparsableProviderResponseError
    );
  });

  it('throws when the field is present but not an array', () => {
    expect(() => parseRequiredStringArrayField('s', '{"headlines": "not an array"}', 'headlines')).toThrow(
      UnparsableProviderResponseError
    );
  });

  it('throws (via parseJsonResponse) when the content is not valid JSON', () => {
    expect(() => parseRequiredStringArrayField('s', 'not json', 'headlines')).toThrow(
      UnparsableProviderResponseError
    );
  });

  it('returns an empty array when the field is present as an empty array', () => {
    expect(parseRequiredStringArrayField('s', '{"headlines": []}', 'headlines')).toEqual([]);
  });
});
