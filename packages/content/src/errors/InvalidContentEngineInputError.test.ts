import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from './InvalidContentEngineInputError.js';

describe('InvalidContentEngineInputError', () => {
  it('sets name, origin, and a message combining both', () => {
    const error = new InvalidContentEngineInputError('content.generate', 'topic must be a non-empty string');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InvalidContentEngineInputError');
    expect(error.origin).toBe('content.generate');
    expect(error.message).toBe(
      'Invalid input for "content.generate": topic must be a non-empty string'
    );
  });

  it('is catchable as a plain Error', () => {
    try {
      throw new InvalidContentEngineInputError('content.rewrite', 'bad input');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});
