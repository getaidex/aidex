/**
 * Small, defensive readers over `unknown` JSON values — every JSON-backed
 * Result parser in this package uses these instead of re-deriving the same
 * type guards. Each returns `undefined` (or an empty collection) rather
 * than throwing; callers decide whether an absent/malformed field is fatal.
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
