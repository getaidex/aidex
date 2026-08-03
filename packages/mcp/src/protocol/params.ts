/**
 * Small, defensive readers over `unknown` JSON-RPC params — the same
 * "coerce.ts" pattern every Aidex Feature Pack uses for parsing provider
 * responses, applied here to inbound protocol params instead. Defined
 * locally rather than imported from anywhere: this package depends on no
 * Feature Pack, and reuses none of their parsing toolkits.
 */

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function asStringRecord(value: unknown): Record<string, string> | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry === 'string') {
      result[key] = entry;
    }
  }
  return result;
}
