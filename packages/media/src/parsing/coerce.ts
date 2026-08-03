/**
 * Small, defensive readers over `unknown` JSON values — ported from
 * @aidex/design's identically-shaped module. Every JSON-backed Result
 * parser in this package uses these instead of re-deriving the same type
 * guards. `asNumber` is new here — `video.storyboard`'s scene descriptions
 * carry an optional `durationSeconds`, the first Result parser in this
 * package that needs a numeric field straight out of provider JSON.
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

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
