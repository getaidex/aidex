/**
 * The one field genuinely common across media operations that benefit
 * from a free-text description of intent — generating new media, editing
 * existing media, planning a storyboard, applying a general transform.
 * Deliberately NOT extended by every request in this pack: purely
 * technical, parameter-driven operations (`image.optimize`,
 * `video.thumbnail`, `audio.transcribe`, `audio.summarize`,
 * `asset.convert`) are fully described by their own explicit fields —
 * forcing a "creative brief" onto "convert this file to mp4" would be
 * artificial, the same reason @aidex/content never gave every request one
 * shared base type either.
 */
export interface MediaBrief {
  readonly brief: string;
}

/** A reference to an existing media asset — the input every transformation/technical operation in this pack starts from. */
export interface MediaSource {
  readonly url: string;
  readonly mimeType: string;
}

/** The result shape for any operation that produces exactly one output file. Operations with a genuinely richer result (multiple variants, transcribed text, a storyboard) define their own instead. */
export interface MediaAssetResult {
  readonly assetUrl: string;
  readonly mimeType: string;
}

// --- General (spans any media kind) ---

/** Purely parametric — the target format fully describes the operation, no brief needed. */
export interface AssetConvertRequest {
  readonly source: MediaSource;
  readonly targetFormat: string;
}
export type AssetConvertResult = MediaAssetResult;

/** `brief` describes the transform to apply (e.g. "crop to a square, remove the background"). */
export interface AssetTransformRequest extends MediaBrief {
  readonly source: MediaSource;
}
export type AssetTransformResult = MediaAssetResult;
