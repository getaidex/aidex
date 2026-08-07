import { describe, expect, it } from 'vitest';
import { AidexError } from './index.js';

describe('@aidex/sdk public API (via package barrel)', () => {
  it('re-exports AidexError as the universal base error type', () => {
    const error = new AidexError('boom');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AidexError');
  });
});
