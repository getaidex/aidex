import { ApiError } from '@google/genai';
import { describe, expect, it } from 'vitest';
import {
  ProviderAuthenticationError,
  ProviderError,
  ProviderInvalidRequestError,
  ProviderRateLimitError,
  ProviderUnavailableError,
} from '../shared/errors.js';
import { translateGeminiError } from './errors.js';

describe('translateGeminiError', () => {
  it.each([
    [401, ProviderAuthenticationError],
    [403, ProviderAuthenticationError],
    [429, ProviderRateLimitError],
    [400, ProviderInvalidRequestError],
    [500, ProviderUnavailableError],
    [503, ProviderUnavailableError],
  ] as const)('maps ApiError with status %i to %s', (status, ExpectedClass) => {
    const apiError = new ApiError({ message: 'vendor said no', status });

    const translated = translateGeminiError(apiError, 'gemini');

    expect(translated).toBeInstanceOf(ExpectedClass);
    expect(translated).toBeInstanceOf(ProviderError);
    expect(translated.provider).toBe('gemini');
    expect(translated.cause).toBe(apiError);
  });

  it('falls back to a generic ProviderError for an unrecognized ApiError status', () => {
    const apiError = new ApiError({ message: 'teapot', status: 418 });

    const translated = translateGeminiError(apiError, 'gemini');

    expect(translated.constructor).toBe(ProviderError);
    expect(translated.message).toContain('418');
    expect(translated.cause).toBe(apiError);
  });

  it('wraps a non-ApiError Error (e.g. a network failure) as a generic ProviderError', () => {
    const networkError = new TypeError('fetch failed');

    const translated = translateGeminiError(networkError, 'gemini');

    expect(translated.constructor).toBe(ProviderError);
    expect(translated.provider).toBe('gemini');
    expect(translated.cause).toBe(networkError);
    expect(translated.message).toContain('fetch failed');
  });

  it('wraps a non-Error thrown value without throwing itself', () => {
    const translated = translateGeminiError('a plain string was thrown', 'gemini');

    expect(translated).toBeInstanceOf(ProviderError);
    expect(translated.cause).toBe('a plain string was thrown');
  });
});
