import type { DesignBranding } from '../../types/DesignBranding.js';
import type { DesignDimensions } from '../../types/DesignDimensions.js';
import type { DesignOutputFormat } from '../../types/DesignOutputFormat.js';

/**
 * assertHasNonEmptyStringField narrows `input` to `Record<string,
 * unknown>`, not to any specific Request type — TypeScript won't allow a
 * direct cast back to e.g. DesignBrandRequest afterwards (it only proved
 * `brief` at runtime, not the rest of the shape). Every engine below only
 * needs a handful of its own optional fields, defensively read, rather
 * than the whole Request — the same "coerce.ts" pattern @aidex/document
 * uses for JSON-parsed provider responses, applied here to already-typed
 * request input instead.
 */

const VALID_OUTPUT_FORMATS: ReadonlySet<string> = new Set(['png', 'jpg', 'svg', 'pdf']);

export function readOutputFormat(input: Record<string, unknown>): DesignOutputFormat | undefined {
  const value = input.outputFormat;
  return typeof value === 'string' && VALID_OUTPUT_FORMATS.has(value)
    ? (value as DesignOutputFormat)
    : undefined;
}

export function readNumber(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function readString(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  return typeof value === 'string' ? value : undefined;
}

export function readBoolean(input: Record<string, unknown>, key: string): boolean | undefined {
  const value = input[key];
  return typeof value === 'boolean' ? value : undefined;
}

export function readBranding(input: Record<string, unknown>): DesignBranding | undefined {
  const value = input.branding;
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const brandName = readString(record, 'brandName');
  const colors = Array.isArray(record.colors)
    ? record.colors.filter((c): c is string => typeof c === 'string')
    : undefined;
  const fonts = Array.isArray(record.fonts)
    ? record.fonts.filter((f): f is string => typeof f === 'string')
    : undefined;
  const logoAssetUrl = readString(record, 'logoAssetUrl');

  if (
    brandName === undefined &&
    colors === undefined &&
    fonts === undefined &&
    logoAssetUrl === undefined
  ) {
    return undefined;
  }

  return {
    ...(brandName !== undefined ? { brandName } : {}),
    ...(colors !== undefined ? { colors } : {}),
    ...(fonts !== undefined ? { fonts } : {}),
    ...(logoAssetUrl !== undefined ? { logoAssetUrl } : {}),
  };
}

export function readDimensions(input: Record<string, unknown>): DesignDimensions | undefined {
  const value = input.dimensions;
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { width, height } = value as Record<string, unknown>;
  if (typeof width !== 'number' || typeof height !== 'number') {
    return undefined;
  }
  const unit = (value as Record<string, unknown>).unit;
  return typeof unit === 'string'
    ? { width, height, unit: unit as DesignDimensions['unit'] }
    : { width, height };
}
