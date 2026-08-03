import type { DesignAsset } from './DesignAsset.js';
import type { DesignAssetResult } from './DesignAssetResult.js';
import type { DesignBranding } from './DesignBranding.js';
import type { DesignBrief } from './DesignBrief.js';
import type { DesignDimensions } from './DesignDimensions.js';

export interface DesignBusinessCardRequest extends DesignBrief {
  readonly dimensions?: DesignDimensions;
  readonly branding?: DesignBranding;
  readonly assets?: readonly DesignAsset[];
  readonly doubleSided?: boolean;
}

/** `back` is only present when the request asked for a double-sided card. */
export interface DesignBusinessCardResult {
  readonly front: DesignAssetResult;
  readonly back?: DesignAssetResult;
}
