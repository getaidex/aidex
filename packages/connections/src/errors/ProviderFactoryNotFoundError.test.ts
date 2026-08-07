import { describe, expect, it } from 'vitest';
import { AidexError } from '@aidex/core';
import { ProviderFactoryNotFoundError } from './ProviderFactoryNotFoundError.js';

describe('ProviderFactoryNotFoundError', () => {
  it('carries the provider type and a descriptive message', () => {
    const error = new ProviderFactoryNotFoundError('gemini');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AidexError);
    expect(error).toBeInstanceOf(ProviderFactoryNotFoundError);
    expect(error.name).toBe('ProviderFactoryNotFoundError');
    expect(error.providerType).toBe('gemini');
    expect(error.message).toBe('No provider factory registered for provider type: "gemini"');
  });

  it('carries an optional executionId', () => {
    const error = new ProviderFactoryNotFoundError('gemini', 'exec-123');
    expect(error.executionId).toBe('exec-123');
  });
});
