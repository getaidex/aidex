/**
 * Small, defensive readers over `Record<string, unknown>` request input —
 * the same "coerce" discipline @aidex/document's/@aidex/content's/
 * @aidex/design's engines already use. `readEnum` is new here (this pack's
 * own): image/video/audio each have their own closed `*OutputFormat`
 * union, so one generic reader parameterized by the valid set replaces
 * three near-identical copies.
 */

export function readString(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  return typeof value === 'string' ? value : undefined;
}

export function readNumber(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function readEnum<T extends string>(
  input: Record<string, unknown>,
  key: string,
  validValues: readonly T[]
): T | undefined {
  const value = input[key];
  return typeof value === 'string' && (validValues as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}
