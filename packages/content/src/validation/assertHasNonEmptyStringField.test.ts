import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { assertHasNonEmptyStringField } from './assertHasNonEmptyStringField.js';

describe('assertHasNonEmptyStringField', () => {
  it('passes when the field is a non-empty string', () => {
    expect(() => assertHasNonEmptyStringField('origin', { topic: 'hello' }, 'topic')).not.toThrow();
  });

  it('throws InvalidContentEngineInputError when input is undefined', () => {
    expect(() => assertHasNonEmptyStringField('origin', undefined, 'topic')).toThrow(
      InvalidContentEngineInputError
    );
  });

  it('throws InvalidContentEngineInputError when input is null', () => {
    expect(() => assertHasNonEmptyStringField('origin', null, 'topic')).toThrow(
      InvalidContentEngineInputError
    );
  });

  it('throws InvalidContentEngineInputError when input is not an object', () => {
    expect(() => assertHasNonEmptyStringField('origin', 'a string', 'topic')).toThrow(
      InvalidContentEngineInputError
    );
  });

  it('throws when the field is missing entirely', () => {
    expect(() => assertHasNonEmptyStringField('origin', {}, 'topic')).toThrow('"topic" must be a non-empty string');
  });

  it('throws when the field is an empty string', () => {
    expect(() => assertHasNonEmptyStringField('origin', { topic: '' }, 'topic')).toThrow(
      '"topic" must be a non-empty string'
    );
  });

  it('throws when the field is not a string', () => {
    expect(() => assertHasNonEmptyStringField('origin', { topic: 42 }, 'topic')).toThrow(
      '"topic" must be a non-empty string'
    );
  });

  it('checks only the named field, ignoring other properties', () => {
    expect(() =>
      assertHasNonEmptyStringField('origin', { topic: 'hello', other: null }, 'topic')
    ).not.toThrow();
  });

  it('includes the origin in the thrown error', () => {
    try {
      assertHasNonEmptyStringField('content.generate', {}, 'topic');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidContentEngineInputError);
      expect((error as InvalidContentEngineInputError).origin).toBe('content.generate');
    }
  });
});
