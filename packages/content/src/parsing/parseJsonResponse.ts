import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';

const CODE_FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;

/**
 * Every JSON-backed Strategy in this package asks its prompt for "strict
 * JSON only", but providers commonly wrap that in a ```json fence anyway —
 * stripped here before parsing rather than asking every prompt author to
 * defend against it themselves. Ported from @aidex/document's
 * identically-shaped module.
 */
export function parseJsonResponse(strategyName: string, content: string): unknown {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(CODE_FENCE_PATTERN);
  const jsonText = fenceMatch ? fenceMatch[1] : trimmed;

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new UnparsableProviderResponseError(strategyName, content, `invalid JSON (${reason})`);
  }
}
