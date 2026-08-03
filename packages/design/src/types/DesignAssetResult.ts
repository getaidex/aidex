import type { DesignOutputFormat } from './DesignOutputFormat.js';

/**
 * The result shape for every engine that produces exactly one generated
 * visual file (a poster, a banner, a mockup, ...). Engines whose result
 * is genuinely richer than "one file" (a brand identity, a two-sided
 * business card, a multi-slide presentation) define their own Result
 * instead of forcing that shape in here.
 */
export interface DesignAssetResult {
  readonly assetUrl: string;
  readonly format: DesignOutputFormat;
  readonly width?: number;
  readonly height?: number;
}
