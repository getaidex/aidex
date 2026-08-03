export interface GuidanceOptions {
  readonly targetAudience?: string;
  readonly style?: string;
  readonly industry?: string;
}

/**
 * Every request in this pack extends DesignBrief, so `targetAudience` and
 * `style` recur in all 7 AI-backed strategies — extracted once, mirroring
 * @aidex/content's identically-purposed helper. `industry` is only ever
 * supplied by DesignBrandStrategy (DesignBrandRequest's one extra field),
 * but stays a generic optional param here rather than forcing a separate
 * helper for one call site.
 */
export function buildGuidanceNote(options: GuidanceOptions): string {
  const parts: string[] = [];

  if (options.targetAudience) {
    parts.push(`the target audience is ${options.targetAudience}`);
  }
  if (options.style) {
    parts.push(`use a ${options.style} style`);
  }
  if (options.industry) {
    parts.push(`the industry is ${options.industry}`);
  }

  return parts.length > 0 ? ` Please note: ${parts.join('; ')}.` : '';
}
