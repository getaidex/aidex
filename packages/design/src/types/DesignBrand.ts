import type { DesignAssetResult } from './DesignAssetResult.js';
import type { DesignBrief } from './DesignBrief.js';

/**
 * Deliberately has no `branding` field, unlike most requests in this pack
 * — this engine creates a brand identity from scratch; there's no
 * existing branding to respect yet.
 */
export interface DesignBrandRequest extends DesignBrief {
  readonly industry?: string;
}

export interface DesignBrandResult {
  readonly logo: DesignAssetResult;
  readonly palette: readonly string[];
  readonly typography: readonly string[];
  readonly guidelines?: string;
}
