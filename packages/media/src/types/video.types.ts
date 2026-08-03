import type { MediaAssetResult, MediaBrief, MediaSource } from './media.types.js';

export type VideoOutputFormat = 'mp4' | 'webm' | 'mov';

// --- media.video.generate ---
export interface VideoGenerateRequest extends MediaBrief {
  readonly durationSeconds?: number;
  readonly outputFormat?: VideoOutputFormat;
}
export type VideoGenerateResult = MediaAssetResult;

// --- media.video.edit ---
export interface VideoEditRequest extends MediaBrief {
  readonly source: MediaSource;
  readonly outputFormat?: VideoOutputFormat;
}
export type VideoEditResult = MediaAssetResult;

// --- media.video.storyboard ---
export interface StoryboardScene {
  readonly description: string;
  readonly durationSeconds?: number;
}
/** `sceneCount`, when supplied, requests that many scenes; omit it to let the implementation choose a default. */
export interface VideoStoryboardRequest extends MediaBrief {
  readonly sceneCount?: number;
}
export interface VideoStoryboardResult {
  readonly scenes: readonly StoryboardScene[];
}

// --- media.video.thumbnail ---
/** Purely parametric — the source and an optional timestamp fully describe the operation, no brief needed. */
export interface VideoThumbnailRequest {
  readonly source: MediaSource;
  readonly timestampSeconds?: number;
  readonly outputFormat?: 'png' | 'jpg';
}
export type VideoThumbnailResult = MediaAssetResult;
