import type { DesignAsset } from './DesignAsset.js';
import type { DesignAssetResult } from './DesignAssetResult.js';
import type { DesignBranding } from './DesignBranding.js';
import type { DesignBrief } from './DesignBrief.js';
import type { DesignDimensions } from './DesignDimensions.js';

/** The generic entry point — no fixed format, no fixed use case. Most other engines in this pack are a more specific version of this one. */
export interface DesignGenerateRequest extends DesignBrief {
  readonly dimensions?: DesignDimensions;
  readonly branding?: DesignBranding;
  readonly assets?: readonly DesignAsset[];
}

export type DesignGenerateResult = DesignAssetResult;
