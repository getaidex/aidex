import type { MediaAssetResult } from '../../types/media.types.js';

/**
 * KNOWN LIMITATION, documented rather than hidden: `Provider.generate()`
 * in this platform is text-only (`{ content: string }`) — there is no
 * image/video/audio-rendering capability anywhere in Aidex, and Phase 3
 * explicitly forbids adding one (no external APIs, no vendor SDKs). So for
 * every engine whose Result is a `MediaAssetResult` (a generated or edited
 * binary asset), "AI-backed" cannot mean "the AI returns real bytes" — it
 * means the AI generates a genuine structured specification (composition,
 * edit instructions, scene direction — whatever the operation calls for)
 * via the same text Provider every other engine in this platform uses, and
 * that specification becomes `assetUrl`, encoded as a `data:text/plain,`
 * URI (RFC 2397) — a real, valid, dereferenceable URL carrying the AI's
 * actual output, not a `placeholder://` string that resolves to nothing
 * and would misrepresent this as still unimplemented. `mimeType` still
 * reflects the *requested* output format (computed deterministically, not
 * by the AI) — the same split @aidex/design's `assetFromDescription`/
 * `DesignAssetResult.format` established. A future Vision/Media Feature
 * Pack or a Provider capable of real binary generation would replace this
 * with an actually-rendered file; nothing about `MediaAssetResult`'s shape
 * needs to change when that happens.
 */
export function mediaAssetFromDescription(description: string, mimeType: string): MediaAssetResult {
  return {
    assetUrl: `data:text/plain,${encodeURIComponent(description)}`,
    mimeType,
  };
}
