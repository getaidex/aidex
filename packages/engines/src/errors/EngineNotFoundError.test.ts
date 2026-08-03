import { describe, expect, it } from 'vitest';
import { EngineNotFoundError } from './EngineNotFoundError.js';

describe('EngineNotFoundError', () => {
  it('carries the missing engine id and a descriptive message', () => {
    const error = new EngineNotFoundError('document.extract');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(EngineNotFoundError);
    expect(error.name).toBe('EngineNotFoundError');
    expect(error.engineId).toBe('document.extract');
    expect(error.message).toBe('Engine not found: "document.extract"');
  });
});
