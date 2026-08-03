import { describe, expect, it } from 'vitest';
import { InvalidEngineError } from './InvalidEngineError.js';

describe('InvalidEngineError', () => {
  it('carries a descriptive message', () => {
    const error = new InvalidEngineError('Engine.id must be a non-empty string');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(InvalidEngineError);
    expect(error.name).toBe('InvalidEngineError');
    expect(error.message).toBe('Engine.id must be a non-empty string');
  });
});
