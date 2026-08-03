import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from './InvalidDesignEngineInputError.js';

describe('InvalidDesignEngineInputError', () => {
  it('sets name, origin, and a message combining both', () => {
    const error = new InvalidDesignEngineInputError('design.brand', '"brief" must be a non-empty string');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InvalidDesignEngineInputError');
    expect(error.origin).toBe('design.brand');
    expect(error.message).toBe('Invalid input for "design.brand": "brief" must be a non-empty string');
  });
});
