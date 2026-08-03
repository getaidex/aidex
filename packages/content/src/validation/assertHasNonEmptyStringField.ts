import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';

/**
 * @aidex/document's engines all share one universal required field
 * (`source`), so its shared validator (`assertHasValidSource`) can check
 * one hardcoded property name. This pack's 14 requests don't share a
 * single field name — `content`, `topic`, `purpose`, `productName`,
 * `brandName` — so the field name is a parameter instead. Every engine's
 * execute() calls this once for its primary required field
 * (`ContentTranslateEngine`/`ContentToneEngine` call it a second time for
 * their one extra required field), the same layering
 * `DocumentTranslateStrategy` uses for its own extra `targetLanguage`
 * check on top of the shared base check.
 */
export function assertHasNonEmptyStringField(
  origin: string,
  input: unknown,
  fieldName: string
): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null) {
    throw new InvalidContentEngineInputError(
      origin,
      `request.input must be an object with a "${fieldName}" property`
    );
  }

  const value = (input as Record<string, unknown>)[fieldName];
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidContentEngineInputError(origin, `"${fieldName}" must be a non-empty string`);
  }
}
