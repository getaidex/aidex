import type { DocumentSource } from '../types/DocumentSource.js';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';

function isDocumentSource(value: unknown): value is DocumentSource {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as DocumentSource).content === 'string' &&
    (value as DocumentSource).content.length > 0 &&
    typeof (value as DocumentSource).mimeType === 'string' &&
    (value as DocumentSource).mimeType.length > 0
  );
}

/**
 * Every request type in this package starts with `{ source: DocumentSource,
 * ... }`. Shared here since every engine's execute() — and every Strategy's,
 * called either through its Engine or directly — needs the identical base
 * check on request.input before it can look at any of its own
 * request-specific fields. `origin` is whatever the caller identifies
 * itself as (an engine id or a Strategy name) purely for the thrown
 * error's message/`.origin` field — never interpreted here.
 */
export function assertHasValidSource(
  origin: string,
  input: unknown
): asserts input is { source: DocumentSource } {
  if (typeof input !== 'object' || input === null || !('source' in input)) {
    throw new InvalidDocumentEngineInputError(
      origin,
      'request.input must be an object with a "source" property'
    );
  }

  if (!isDocumentSource((input as { source: unknown }).source)) {
    throw new InvalidDocumentEngineInputError(
      origin,
      'source.content and source.mimeType must be non-empty strings'
    );
  }
}
