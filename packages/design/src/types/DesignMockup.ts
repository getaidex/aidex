import type { DesignAsset } from './DesignAsset.js';
import type { DesignAssetResult } from './DesignAssetResult.js';
import type { DesignBrief } from './DesignBrief.js';

/**
 * `assets`, here, is usually the one thing being mocked up (a logo, a
 * label, a screen design) — no `dimensions`/`branding`, since the scene
 * (e.g. "phone", "billboard", "t-shirt") defines the composition, not a
 * canvas size or brand palette.
 */
export interface DesignMockupRequest extends DesignBrief {
  readonly assets?: readonly DesignAsset[];
  readonly mockupType?: string;
}

export type DesignMockupResult = DesignAssetResult;
