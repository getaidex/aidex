import type { MediaAssetResult, MediaBrief, MediaSource } from './media.types.js';

export type AudioOutputFormat = 'mp3' | 'wav' | 'ogg';

// --- media.audio.generate ---
export interface AudioGenerateRequest extends MediaBrief {
  readonly durationSeconds?: number;
  readonly outputFormat?: AudioOutputFormat;
}
export type AudioGenerateResult = MediaAssetResult;

// --- media.audio.transcribe ---
/** Purely parametric — the source (and an optional language hint) fully describe the operation, no brief needed. */
export interface AudioTranscribeRequest {
  readonly source: MediaSource;
  readonly language?: string;
}
export interface AudioTranscribeResult {
  readonly text: string;
  readonly detectedLanguage?: string;
}

// --- media.audio.summarize ---
/** Mirrors @aidex/document's/@aidex/content's DocumentSummarizeRequest/ContentSummarizeRequest shape — driven by `source`, not a creative brief, the same reason those don't have one either. */
export interface AudioSummarizeRequest {
  readonly source: MediaSource;
  readonly maxLength?: number;
}
export interface AudioSummarizeResult {
  readonly summary: string;
}
