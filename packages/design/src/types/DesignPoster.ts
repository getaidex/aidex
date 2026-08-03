import type { DesignAsset } from './DesignAsset.js';
import type { DesignAssetResult } from './DesignAssetResult.js';
import type { DesignBranding } from './DesignBranding.js';
import type { DesignBrief } from './DesignBrief.js';
import type { DesignDimensions } from './DesignDimensions.js';

export interface DesignPosterRequest extends DesignBrief {
  readonly dimensions?: DesignDimensions;
  readonly branding?: DesignBranding;
  readonly assets?: readonly DesignAsset[];
}

export type DesignPosterResult = DesignAssetResult;
