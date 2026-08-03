import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { assertHasNonEmptyStringField } from './assertHasNonEmptyStringField.js';

describe('assertHasNonEmptyStringField', () => {
  it('passes when the field is a non-empty string', () => {
    expect(() => assertHasNonEmptyStringField('origin', { brief: 'hello' }, 'brief')).not.toThrow();
  });

  it('throws InvalidMediaEngineInputError when input is undefined, null, or not an object', () => {
    expect(() => assertHasNonEmptyStringField('origin', undefined, 'brief')).toThrow(
      InvalidMediaEngineInputError
    );
    expect(() => assertHasNonEmptyStringField('origin', null, 'brief')).toThrow(InvalidMediaEngineInputError);
    expect(() => assertHasNonEmptyStringField('origin', 'x', 'brief')).toThrow(InvalidMediaEngineInputError);
  });

  it('throws when the field is missing, empty, or not a string', () => {
    expect(() => assertHasNonEmptyStringField('origin', {}, 'brief')).toThrow('"brief" must be a non-empty string');
    expect(() => assertHasNonEmptyStringField('origin', { brief: '' }, 'brief')).toThrow(
      '"brief" must be a non-empty string'
    );
    expect(() => assertHasNonEmptyStringField('origin', { brief: 42 }, 'brief')).toThrow(
      '"brief" must be a non-empty string'
    );
  });

  it('includes the origin in the thrown error', () => {
    try {
      assertHasNonEmptyStringField('media.image.generate', {}, 'brief');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidMediaEngineInputError);
      expect((error as InvalidMediaEngineInputError).origin).toBe('media.image.generate');
    }
  });
});
