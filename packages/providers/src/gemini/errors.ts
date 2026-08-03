import { ApiError } from '@google/genai';
import {
  ProviderAuthenticationError,
  ProviderError,
  ProviderInvalidRequestError,
  ProviderRateLimitError,
  ProviderUnavailableError,
} from '../shared/errors.js';

/**
 * Maps whatever @google/genai threw into a vendor-agnostic ProviderError
 * subclass. `@google/genai` exposes exactly one API-level error type —
 * `ApiError extends Error { status: number }` (confirmed against the SDK's
 * own .d.ts) — so the HTTP-like status code is the only signal available to
 * classify by. Anything that isn't an ApiError (a network failure, a plain
 * thrown Error from the fetch layer) becomes a generic ProviderError
 * wrapping the original as `.cause`, never left untranslated.
 */
export function translateGeminiError(error: unknown, providerName: string): ProviderError {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return new ProviderAuthenticationError(providerName, error);
    }
    if (error.status === 429) {
      return new ProviderRateLimitError(providerName, error);
    }
    if (error.status === 400) {
      return new ProviderInvalidRequestError(providerName, error);
    }
    if (error.status >= 500) {
      return new ProviderUnavailableError(providerName, error);
    }
    return new ProviderError(
      `${providerName}: request failed (status ${error.status})`,
      providerName,
      error
    );
  }

  if (error instanceof Error) {
    return new ProviderError(`${providerName}: ${error.message}`, providerName, error);
  }

  return new ProviderError(`${providerName}: unknown error`, providerName, error);
}
