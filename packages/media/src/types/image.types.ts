import type { MediaAssetResult, MediaBrief, MediaSource } from './media.types.js';

export type ImageOutputFormat = 'png' | 'jpg' | 'webp' | 'svg';

export interface ImageDimensions {
  readonly width: number;
  readonly height: number;
}

// --- media.image.generate ---
export interface ImageGenerateRequest extends MediaBrief {
  readonly dimensions?: ImageDimensions;
  readonly outputFormat?: ImageOutputFormat;
}
export type ImageGenerateResult = MediaAssetResult;

// --- media.image.edit ---
export interface ImageEditRequest extends MediaBrief {
  readonly source: MediaSource;
  readonly outputFormat?: ImageOutputFormat;
}
export type ImageEditResult = MediaAssetResult;

// --- media.image.variant ---
/** `variantCount`, when supplied, requests that many variants; omit it to let the implementation choose a default. */
export interface ImageVariantRequest extends MediaBrief {
  readonly source: MediaSource;
  readonly variantCount?: number;
  readonly outputFormat?: ImageOutputFormat;
}
export interface ImageVariantResult {
  readonly variants: readonly MediaAssetResult[];
}

// --- media.image.optimize ---
/** Purely parametric — target format/size constraints fully describe the operation, no brief needed. */
export interface ImageOptimizeRequest {
  readonly source: MediaSource;
  readonly targetFormat?: ImageOutputFormat;
  readonly maxFileSizeKb?: number;
}
export interface ImageOptimizeResult extends MediaAssetResult {
  readonly fileSizeKb?: number;
}
