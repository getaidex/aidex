import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from './InvalidMediaEngineInputError.js';

describe('InvalidMediaEngineInputError', () => {
  it('sets name, origin, and a message combining both', () => {
    const error = new InvalidMediaEngineInputError('media.image.generate', '"brief" must be a non-empty string');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InvalidMediaEngineInputError');
    expect(error.origin).toBe('media.image.generate');
    expect(error.message).toBe(
      'Invalid input for "media.image.generate": "brief" must be a non-empty string'
    );
  });
});
