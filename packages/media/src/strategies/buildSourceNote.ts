import type { MediaSource } from '../types/media.types.js';

/**
 * 9 of this package's 13 strategies take a `source` and need to mention it
 * in their prompt — extracted once rather than repeated 9 times. Mirrors
 * @aidex/design's `buildGuidanceNote` in spirit: a small sentence-builder
 * folded into the prompt in JS, not passed as raw structured data.
 */
export function buildSourceNote(source: MediaSource): string {
  return ` The source asset is at ${source.url} (${source.mimeType}).`;
}
