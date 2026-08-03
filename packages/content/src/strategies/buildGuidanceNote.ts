export interface GuidanceOptions {
  readonly keywords?: readonly string[];
  readonly tone?: string;
  readonly length?: number;
}

/**
 * ContentGenerateRequest and ContentBlogRequest both offer the identical
 * trio of optional guidance fields (keywords/tone/a target length, even
 * though Blog's is named `targetLength` — callers pass whichever local
 * value applies as `length`). Extracted once both strategies needed the
 * exact same combination, rather than duplicating it a second time.
 */
export function buildGuidanceNote(options: GuidanceOptions): string {
  const parts: string[] = [];

  if (options.keywords && options.keywords.length > 0) {
    parts.push(`incorporate these keywords: ${options.keywords.join(', ')}`);
  }
  if (options.tone) {
    parts.push(`use a ${options.tone} tone`);
  }
  if (options.length !== undefined) {
    parts.push(`aim for approximately ${options.length} words`);
  }

  return parts.length > 0 ? ` Please ${parts.join('; ')}.` : '';
}
