import { describe, expect, it } from 'vitest';
import { AidexError } from '@aidex/core';
import { MissingProviderError } from './MissingProviderError.js';

describe('MissingProviderError', () => {
  it('carries a fixed, descriptive message', () => {
    const error = new MissingProviderError();

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AidexError);
    expect(error).toBeInstanceOf(MissingProviderError);
    expect(error.name).toBe('MissingProviderError');
    expect(error.message).toBe(
      'AIBuilder.build() requires a provider. Call .provider(provider) before .build().'
    );
  });
});
