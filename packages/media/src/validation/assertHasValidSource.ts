import type { MediaSource } from '../types/media.types.js';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';

function isMediaSource(value: unknown): value is MediaSource {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as MediaSource).url === 'string' &&
    (value as MediaSource).url.length > 0 &&
    typeof (value as MediaSource).mimeType === 'string' &&
    (value as MediaSource).mimeType.length > 0
  );
}

/**
 * Mirrors @aidex/document's `assertHasValidSource` exactly (`url`/
 * `mimeType` instead of `content`/`mimeType`) — 9 of this pack's 13
 * requests require a `source: MediaSource`; the 4 pure-generation ones
 * (`image.generate`, `video.generate`, `video.storyboard`,
 * `audio.generate`) don't have one to validate.
 *
 * Narrows to `Record<string, unknown> & { source: MediaSource }`, not
 * just `{ source: MediaSource }`, specifically so callers that also call
 * `assertHasNonEmptyStringField` on the same `input` (e.g.
 * `image.edit`, needing both `brief` and `source`) keep read access to
 * every other already-validated field afterward.
 */
export function assertHasValidSource(
  origin: string,
  input: unknown
): asserts input is Record<string, unknown> & { source: MediaSource } {
  if (typeof input !== 'object' || input === null || !('source' in input)) {
    throw new InvalidMediaEngineInputError(
      origin,
      'request.input must be an object with a "source" property'
    );
  }

  if (!isMediaSource((input as { source: unknown }).source)) {
    throw new InvalidMediaEngineInputError(
      origin,
      'source.url and source.mimeType must be non-empty strings'
    );
  }
}
