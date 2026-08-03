import { describe, expect, it } from 'vitest';
import {
  ProviderAuthenticationError,
  ProviderError,
  ProviderInvalidRequestError,
  ProviderRateLimitError,
  ProviderUnavailableError,
} from './errors.js';

describe('ProviderError', () => {
  it('carries the provider name, an optional cause, and a plain message', () => {
    const cause = new Error('root cause');
    const error = new ProviderError('gemini: something went wrong', 'gemini', cause);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ProviderError');
    expect(error.provider).toBe('gemini');
    expect(error.cause).toBe(cause);
    expect(error.message).toBe('gemini: something went wrong');
  });

  it('works without a cause', () => {
    const error = new ProviderError('gemini: oops', 'gemini');
    expect(error.cause).toBeUndefined();
  });
});

describe.each([
  [ProviderAuthenticationError, 'ProviderAuthenticationError', 'authentication failed'],
  [ProviderRateLimitError, 'ProviderRateLimitError', 'rate limit exceeded'],
  [ProviderInvalidRequestError, 'ProviderInvalidRequestError', 'invalid request'],
  [ProviderUnavailableError, 'ProviderUnavailableError', 'temporarily unavailable'],
] as const)('%s', (ErrorClass, expectedName, expectedMessageFragment) => {
  it(`is a ProviderError with name "${expectedName}"`, () => {
    const error = new ErrorClass('gemini');

    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(expectedName);
    expect(error.provider).toBe('gemini');
    expect(error.message).toContain(expectedMessageFragment);
  });

  it('carries the original error as cause', () => {
    const cause = new Error('vendor said no');
    const error = new ErrorClass('gemini', cause);

    expect(error.cause).toBe(cause);
  });
});
