import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';

/**
 * Marketing-specific counterpart to `assertHasNonEmptyStringField` — 3
 * requests (`social.schedule`'s `posts`, `analytics.summary`'s and
 * `analytics.insights`' `metrics`) require a non-empty array rather than a
 * non-empty string, the first Feature Pack whose Phase 1 contracts need
 * this shape of validation shared across more than one engine.
 */
export function assertHasNonEmptyArrayField(
  origin: string,
  input: unknown,
  fieldName: string
): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null) {
    throw new InvalidMarketingEngineInputError(origin, `expected an object with a non-empty "${fieldName}" array`);
  }

  const value = (input as Record<string, unknown>)[fieldName];
  if (!Array.isArray(value) || value.length === 0) {
    throw new InvalidMarketingEngineInputError(origin, `expected a non-empty "${fieldName}" array`);
  }
}
