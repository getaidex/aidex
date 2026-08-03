import type { DesignAssetResult } from './DesignAssetResult.js';
import type { DesignBranding } from './DesignBranding.js';
import type { DesignBrief } from './DesignBrief.js';

/** No `dimensions` — logos are typically produced vector-first (`outputFormat: 'svg'`), not authored against a fixed canvas size the way a poster is. */
export interface DesignLogoRequest extends DesignBrief {
  readonly branding?: DesignBranding;
  readonly variantsCount?: number;
}

/** `variants`, when present, are alternate forms (icon-only, monochrome, ...) alongside the primary mark. */
export interface DesignLogoResult {
  readonly primary: DesignAssetResult;
  readonly variants?: readonly DesignAssetResult[];
}
