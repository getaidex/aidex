import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { asRecord, asStringArray } from './coerce.js';
import { parseJsonResponse } from './parseJsonResponse.js';

/**
 * ContentHeadlineResult and ContentTaglineResult are both "one required
 * array of strings" — extracted once both needed the identical shape:
 * parse JSON, require `fieldName` to exist as an array (that's the whole
 * point of the call, so a missing/non-array field is a genuine parse
 * failure, not an omittable optional), then filter individual non-string
 * entries rather than failing the whole response over one bad entry.
 */
export function parseRequiredStringArrayField(
  strategyName: string,
  content: string,
  fieldName: string
): string[] {
  const parsed = asRecord(parseJsonResponse(strategyName, content));
  const raw = parsed?.[fieldName];

  if (!Array.isArray(raw)) {
    throw new UnparsableProviderResponseError(
      strategyName,
      content,
      `expected an object with a "${fieldName}" array`
    );
  }

  return asStringArray(raw);
}
