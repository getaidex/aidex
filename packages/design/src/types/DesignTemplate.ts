import type { DesignAsset } from './DesignAsset.js';
import type { DesignAssetResult } from './DesignAssetResult.js';
import type { DesignBranding } from './DesignBranding.js';
import type { DesignBrief } from './DesignBrief.js';
import type { DesignDimensions } from './DesignDimensions.js';

export interface DesignTemplateRequest extends DesignBrief {
  readonly dimensions?: DesignDimensions;
  readonly branding?: DesignBranding;
  readonly assets?: readonly DesignAsset[];
  readonly editableFields?: readonly string[];
}

/** `editableFields` echoes back which parts of `asset` are meant to be customized (e.g. "headline", "photo") — a reusable template, not a one-off design. */
export interface DesignTemplateResult {
  readonly asset: DesignAssetResult;
  readonly editableFields?: readonly string[];
}
