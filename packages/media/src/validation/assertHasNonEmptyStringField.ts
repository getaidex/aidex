import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';

/**
 * Ported from @aidex/content's/@aidex/design's identically-shaped helper.
 * Used for `brief` (the 8 requests extending MediaBrief) and for
 * `targetFormat` (media.asset.convert's one required parametric field) —
 * the field name stays a parameter since this pack doesn't have one
 * universal required field the way @aidex/design's `brief` was for all 14.
 */
export function assertHasNonEmptyStringField(
  origin: string,
  input: unknown,
  fieldName: string
): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null) {
    throw new InvalidMediaEngineInputError(
      origin,
      `request.input must be an object with a "${fieldName}" property`
    );
  }

  const value = (input as Record<string, unknown>)[fieldName];
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidMediaEngineInputError(origin, `"${fieldName}" must be a non-empty string`);
  }
}
