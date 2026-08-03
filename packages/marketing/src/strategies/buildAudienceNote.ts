/**
 * 8 of this package's 14 requests extend `MarketingBrief` and can supply
 * an optional `targetAudience` — extracted once rather than repeated 8
 * times. Mirrors @aidex/design's `buildGuidanceNote`/@aidex/media's
 * `buildSourceNote` in spirit: a small sentence folded into the prompt in
 * JS, not passed as raw structured data.
 */
export function buildAudienceNote(targetAudience: string | undefined): string {
  return targetAudience ? ` The target audience is ${targetAudience}.` : '';
}
