/**
 * Small, defensive readers over `Record<string, unknown>` request input —
 * the same "coerce" discipline @aidex/document's/@aidex/content's/
 * @aidex/design's/@aidex/media's engines already use.
 */

export function readString(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  return typeof value === 'string' ? value : undefined;
}

export function readNumber(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function readStringArray(input: Record<string, unknown>, key: string): string[] | undefined {
  const value = input[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined;
}
