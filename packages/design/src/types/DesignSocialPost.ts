import type { DesignAsset } from './DesignAsset.js';
import type { DesignAssetResult } from './DesignAssetResult.js';
import type { DesignBranding } from './DesignBranding.js';
import type { DesignBrief } from './DesignBrief.js';
import type { DesignDimensions } from './DesignDimensions.js';

/** `platform`, when supplied, is a free-form hint (e.g. "instagram", "linkedin", "tiktok") — no closed platform enum in Phase 1. */
export interface DesignSocialPostRequest extends DesignBrief {
  readonly dimensions?: DesignDimensions;
  readonly platform?: string;
  readonly branding?: DesignBranding;
  readonly assets?: readonly DesignAsset[];
}

export type DesignSocialPostResult = DesignAssetResult;
