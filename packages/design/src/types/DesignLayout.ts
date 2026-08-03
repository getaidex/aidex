import type { DesignAsset } from './DesignAsset.js';
import type { DesignAssetResult } from './DesignAssetResult.js';
import type { DesignBrief } from './DesignBrief.js';
import type { DesignDimensions } from './DesignDimensions.js';

/** `contentBlocks`, when supplied, names the sections/elements to arrange (e.g. "headline", "product image", "call to action"). */
export interface DesignLayoutRequest extends DesignBrief {
  readonly dimensions?: DesignDimensions;
  readonly assets?: readonly DesignAsset[];
  readonly contentBlocks?: readonly string[];
}

export type DesignLayoutResult = DesignAssetResult;
