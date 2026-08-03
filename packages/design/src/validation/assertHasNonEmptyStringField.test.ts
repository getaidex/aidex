import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { assertHasNonEmptyStringField } from './assertHasNonEmptyStringField.js';

describe('assertHasNonEmptyStringField', () => {
  it('passes when the field is a non-empty string', () => {
    expect(() => assertHasNonEmptyStringField('origin', { brief: 'hello' }, 'brief')).not.toThrow();
  });

  it('throws InvalidDesignEngineInputError when input is undefined, null, or not an object', () => {
    expect(() => assertHasNonEmptyStringField('origin', undefined, 'brief')).toThrow(
      InvalidDesignEngineInputError
    );
    expect(() => assertHasNonEmptyStringField('origin', null, 'brief')).toThrow(InvalidDesignEngineInputError);
    expect(() => assertHasNonEmptyStringField('origin', 'x', 'brief')).toThrow(InvalidDesignEngineInputError);
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
      assertHasNonEmptyStringField('design.brand', {}, 'brief');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidDesignEngineInputError);
      expect((error as InvalidDesignEngineInputError).origin).toBe('design.brand');
    }
  });
});
