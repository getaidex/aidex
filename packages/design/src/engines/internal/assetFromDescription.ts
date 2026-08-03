import type { DesignAssetResult } from '../../types/DesignAssetResult.js';
import type { DesignOutputFormat } from '../../types/DesignOutputFormat.js';

/**
 * KNOWN LIMITATION, documented rather than hidden: `Provider.generate()`
 * in this platform is text-only (`{ content: string }`) — there is no
 * image-rendering capability anywhere in Aidex, and Phase 3 explicitly
 * forbids adding one (no external APIs). So for every engine whose Result
 * includes a `DesignAssetResult` (a generated visual file), "AI-backed"
 * cannot mean "the AI returns real pixels" — it means the AI generates a
 * genuine creative specification (composition, color, typography,
 * imagery direction) via the same text Provider every other engine in
 * this platform uses, and that specification becomes `assetUrl`, encoded
 * as a `data:text/plain,` URI (RFC 2397) — a real, valid, dereferenceable
 * URL carrying the AI's actual output, not a `placeholder://` string that
 * resolves to nothing and would misrepresent this as still unimplemented.
 * A future Vision/Media Feature Pack or a Provider capable of real image
 * generation would replace this with an actually-rendered file; nothing
 * about this Result shape needs to change when that happens.
 */
export function assetFromDescription(description: string, format: DesignOutputFormat): DesignAssetResult {
  return {
    assetUrl: `data:text/plain,${encodeURIComponent(description)}`,
    format,
  };
}
