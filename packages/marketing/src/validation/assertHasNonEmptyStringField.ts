import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';

/**
 * Parameterized by field name — unlike @aidex/document's single universal
 * field, this pack (like @aidex/content/@aidex/design/@aidex/media before
 * it) has no one field every request shares, so every call site names its
 * own required field.
 */
export function assertHasNonEmptyStringField(
  origin: string,
  input: unknown,
  fieldName: string
): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null) {
    throw new InvalidMarketingEngineInputError(origin, `expected an object with a non-empty "${fieldName}" string`);
  }

  const value = (input as Record<string, unknown>)[fieldName];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidMarketingEngineInputError(origin, `expected a non-empty "${fieldName}" string`);
  }
}
