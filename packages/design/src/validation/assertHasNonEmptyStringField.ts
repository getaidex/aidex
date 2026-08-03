import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';

/**
 * Ported from @aidex/content's identically-shaped helper. Every request in
 * this pack extends DesignBrief, whose one required field is always named
 * `brief` — so in practice every call site here passes `'brief'` — but the
 * field name stays a parameter (not hardcoded) for the same reason
 * @aidex/content's version is: a future engine with a second required
 * field (mirroring ContentTranslateEngine's `targetLanguage`) can reuse
 * this without a new helper.
 */
export function assertHasNonEmptyStringField(
  origin: string,
  input: unknown,
  fieldName: string
): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null) {
    throw new InvalidDesignEngineInputError(
      origin,
      `request.input must be an object with a "${fieldName}" property`
    );
  }

  const value = (input as Record<string, unknown>)[fieldName];
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidDesignEngineInputError(origin, `"${fieldName}" must be a non-empty string`);
  }
}
