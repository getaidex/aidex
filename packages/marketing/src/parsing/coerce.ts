/**
 * Small, defensive readers over `unknown` JSON values — ported from
 * @aidex/design's/@aidex/media's identically-shaped module. `asRecordArray`
 * and `asNumberArray` are new here: several Result shapes in this pack
 * (`CampaignPlanResult.objectives`, `SeoKeywordsResult.keywords`,
 * `SeoAuditResult.findings`, `AnalyticsInsightsResult.insights`) are
 * arrays of objects, not arrays of strings, and `social.schedule`'s
 * response is a reordering of numeric indices.
 */

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function asNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
    : [];
}

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map((item) => asRecord(item)).filter((item) => item !== undefined) : [];
}
