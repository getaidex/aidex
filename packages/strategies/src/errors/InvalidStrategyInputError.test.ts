import { describe, expect, it } from 'vitest';
import { AidexError } from '@aidex/core';
import { InvalidStrategyInputError } from './InvalidStrategyInputError.js';

describe('InvalidStrategyInputError', () => {
  it('carries a plain message and no other structured fields', () => {
    const error = new InvalidStrategyInputError('bad input');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AidexError);
    expect(error).toBeInstanceOf(InvalidStrategyInputError);
    expect(error.name).toBe('InvalidStrategyInputError');
    expect(error.message).toBe('bad input');
  });
});
