/**
 * The Engine ids this Feature Pack will register once execution is
 * implemented. Namespaced `<domain>.<kind>.<action>`, matching the id
 * shape `@aidex/engines`' EngineRegistry expects — the same convention
 * `@aidex/document`'s DocumentEngineId, `@aidex/content`'s ContentEngineId,
 * and `@aidex/design`'s DesignEngineId established. Phase 1 defines these
 * ids only — no Engine implementing them exists yet.
 */
export const MediaEngineId = {
  ImageGenerate: 'media.image.generate',
  ImageEdit: 'media.image.edit',
  ImageVariant: 'media.image.variant',
  ImageOptimize: 'media.image.optimize',
  VideoGenerate: 'media.video.generate',
  VideoEdit: 'media.video.edit',
  VideoStoryboard: 'media.video.storyboard',
  VideoThumbnail: 'media.video.thumbnail',
  AudioGenerate: 'media.audio.generate',
  AudioTranscribe: 'media.audio.transcribe',
  AudioSummarize: 'media.audio.summarize',
  AssetConvert: 'media.asset.convert',
  AssetTransform: 'media.asset.transform',
} as const;

export type MediaEngineId = (typeof MediaEngineId)[keyof typeof MediaEngineId];
