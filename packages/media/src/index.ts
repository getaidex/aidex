export { MediaEngineId } from './identifiers.js';

export { MEDIA_ENGINE_METADATA } from './engines/metadata.js';

export { MEDIA_FEATURE_PACKAGE } from './featurePackage.js';
export type { MediaWorkflow } from './featurePackage.js';

// Workflows — reusable multi-engine compositions (Phase 4)
export {
  ImageEnhancementWorkflow,
  IMAGE_ENHANCEMENT_WORKFLOW_ID,
} from './workflows/ImageEnhancementWorkflow.js';
export type {
  ImageEnhancementWorkflowInput,
  ImageEnhancementResult,
  ImageEnhancementWorkflowConfig,
} from './workflows/ImageEnhancementWorkflow.js';
export {
  VideoPreparationWorkflow,
  VIDEO_PREPARATION_WORKFLOW_ID,
} from './workflows/VideoPreparationWorkflow.js';
export type {
  VideoPreparationWorkflowInput,
  VideoPreparationResult,
  VideoPreparationWorkflowConfig,
} from './workflows/VideoPreparationWorkflow.js';
export {
  AudioProcessingWorkflow,
  AUDIO_PROCESSING_WORKFLOW_ID,
} from './workflows/AudioProcessingWorkflow.js';
export type {
  AudioProcessingWorkflowInput,
  AudioProcessingResult,
  AudioProcessingWorkflowConfig,
} from './workflows/AudioProcessingWorkflow.js';

// Engines (Phase 3 — AI-backed: prompt → provider → structured result)
export { ImageGenerateEngine } from './engines/ImageGenerateEngine.js';
export type { ImageGenerateEngineConfig } from './engines/ImageGenerateEngine.js';
export { ImageEditEngine } from './engines/ImageEditEngine.js';
export type { ImageEditEngineConfig } from './engines/ImageEditEngine.js';
export { ImageVariantEngine } from './engines/ImageVariantEngine.js';
export type { ImageVariantEngineConfig } from './engines/ImageVariantEngine.js';
export { ImageOptimizeEngine } from './engines/ImageOptimizeEngine.js';
export type { ImageOptimizeEngineConfig } from './engines/ImageOptimizeEngine.js';
export { VideoGenerateEngine } from './engines/VideoGenerateEngine.js';
export type { VideoGenerateEngineConfig } from './engines/VideoGenerateEngine.js';
export { VideoEditEngine } from './engines/VideoEditEngine.js';
export type { VideoEditEngineConfig } from './engines/VideoEditEngine.js';
export { VideoStoryboardEngine } from './engines/VideoStoryboardEngine.js';
export type { VideoStoryboardEngineConfig } from './engines/VideoStoryboardEngine.js';
export { VideoThumbnailEngine } from './engines/VideoThumbnailEngine.js';
export type { VideoThumbnailEngineConfig } from './engines/VideoThumbnailEngine.js';
export { AudioGenerateEngine } from './engines/AudioGenerateEngine.js';
export type { AudioGenerateEngineConfig } from './engines/AudioGenerateEngine.js';
export { AudioTranscribeEngine } from './engines/AudioTranscribeEngine.js';
export type { AudioTranscribeEngineConfig } from './engines/AudioTranscribeEngine.js';
export { AudioSummarizeEngine } from './engines/AudioSummarizeEngine.js';
export type { AudioSummarizeEngineConfig } from './engines/AudioSummarizeEngine.js';
export { AssetConvertEngine } from './engines/AssetConvertEngine.js';
export type { AssetConvertEngineConfig } from './engines/AssetConvertEngine.js';
export { AssetTransformEngine } from './engines/AssetTransformEngine.js';
export type { AssetTransformEngineConfig } from './engines/AssetTransformEngine.js';

// Strategies
export { ImageGenerateStrategy, parseImageGenerateResponse } from './strategies/ImageGenerateStrategy.js';
export type { ImageGenerateStrategyConfig } from './strategies/ImageGenerateStrategy.js';
export { ImageEditStrategy, parseImageEditResponse } from './strategies/ImageEditStrategy.js';
export type { ImageEditStrategyConfig } from './strategies/ImageEditStrategy.js';
export { ImageVariantStrategy, parseImageVariantResponse } from './strategies/ImageVariantStrategy.js';
export type { ImageVariantStrategyConfig } from './strategies/ImageVariantStrategy.js';
export { ImageOptimizeStrategy, parseImageOptimizeResponse } from './strategies/ImageOptimizeStrategy.js';
export type { ImageOptimizeStrategyConfig } from './strategies/ImageOptimizeStrategy.js';
export { VideoGenerateStrategy, parseVideoGenerateResponse } from './strategies/VideoGenerateStrategy.js';
export type { VideoGenerateStrategyConfig } from './strategies/VideoGenerateStrategy.js';
export { VideoEditStrategy, parseVideoEditResponse } from './strategies/VideoEditStrategy.js';
export type { VideoEditStrategyConfig } from './strategies/VideoEditStrategy.js';
export {
  VideoStoryboardStrategy,
  parseVideoStoryboardResponse,
} from './strategies/VideoStoryboardStrategy.js';
export type { VideoStoryboardStrategyConfig } from './strategies/VideoStoryboardStrategy.js';
export { VideoThumbnailStrategy, parseVideoThumbnailResponse } from './strategies/VideoThumbnailStrategy.js';
export type { VideoThumbnailStrategyConfig } from './strategies/VideoThumbnailStrategy.js';
export { AudioGenerateStrategy, parseAudioGenerateResponse } from './strategies/AudioGenerateStrategy.js';
export type { AudioGenerateStrategyConfig } from './strategies/AudioGenerateStrategy.js';
export {
  AudioTranscribeStrategy,
  parseAudioTranscribeResponse,
} from './strategies/AudioTranscribeStrategy.js';
export type { AudioTranscribeStrategyConfig } from './strategies/AudioTranscribeStrategy.js';
export {
  AudioSummarizeStrategy,
  parseAudioSummarizeResponse,
} from './strategies/AudioSummarizeStrategy.js';
export type { AudioSummarizeStrategyConfig } from './strategies/AudioSummarizeStrategy.js';
export { AssetConvertStrategy, parseAssetConvertResponse } from './strategies/AssetConvertStrategy.js';
export type { AssetConvertStrategyConfig } from './strategies/AssetConvertStrategy.js';
export { AssetTransformStrategy, parseAssetTransformResponse } from './strategies/AssetTransformStrategy.js';
export type { AssetTransformStrategyConfig } from './strategies/AssetTransformStrategy.js';

// Prompts
export { IMAGE_GENERATE_PROMPT, IMAGE_GENERATE_PROMPT_ID } from './prompts/imageGeneratePrompt.js';
export { IMAGE_EDIT_PROMPT, IMAGE_EDIT_PROMPT_ID } from './prompts/imageEditPrompt.js';
export { IMAGE_VARIANT_PROMPT, IMAGE_VARIANT_PROMPT_ID } from './prompts/imageVariantPrompt.js';
export { IMAGE_OPTIMIZE_PROMPT, IMAGE_OPTIMIZE_PROMPT_ID } from './prompts/imageOptimizePrompt.js';
export { VIDEO_GENERATE_PROMPT, VIDEO_GENERATE_PROMPT_ID } from './prompts/videoGeneratePrompt.js';
export { VIDEO_EDIT_PROMPT, VIDEO_EDIT_PROMPT_ID } from './prompts/videoEditPrompt.js';
export { VIDEO_STORYBOARD_PROMPT, VIDEO_STORYBOARD_PROMPT_ID } from './prompts/videoStoryboardPrompt.js';
export { VIDEO_THUMBNAIL_PROMPT, VIDEO_THUMBNAIL_PROMPT_ID } from './prompts/videoThumbnailPrompt.js';
export { AUDIO_GENERATE_PROMPT, AUDIO_GENERATE_PROMPT_ID } from './prompts/audioGeneratePrompt.js';
export { AUDIO_TRANSCRIBE_PROMPT, AUDIO_TRANSCRIBE_PROMPT_ID } from './prompts/audioTranscribePrompt.js';
export { AUDIO_SUMMARIZE_PROMPT, AUDIO_SUMMARIZE_PROMPT_ID } from './prompts/audioSummarizePrompt.js';
export { ASSET_CONVERT_PROMPT, ASSET_CONVERT_PROMPT_ID } from './prompts/assetConvertPrompt.js';
export { ASSET_TRANSFORM_PROMPT, ASSET_TRANSFORM_PROMPT_ID } from './prompts/assetTransformPrompt.js';

export type { MediaEnginePricing } from './pricing/MediaEnginePricing.js';

// Errors
export { InvalidMediaEngineInputError } from './errors/InvalidMediaEngineInputError.js';
export { UnparsableProviderResponseError } from './errors/UnparsableProviderResponseError.js';

// Note: assertHasNonEmptyStringField, assertHasValidSource, buildSourceNote,
// callProviderWithObservability/CallProviderWithObservabilityParams, the
// src/parsing/ toolkit (parseJsonResponse, coerce.ts), and
// src/engines/internal/ helpers (mediaAssetFromDescription.ts,
// readField.ts, mimeTypes.ts, placeholder.ts) are deliberately NOT
// exported — internal plumbing every strategy shares, not a capability
// external consumers need, the same convention @aidex/document's,
// @aidex/content's, and @aidex/design's own audits established.

// Shared base + General
export type { MediaBrief, MediaSource, MediaAssetResult } from './types/media.types.js';
export type { AssetConvertRequest, AssetConvertResult } from './types/media.types.js';
export type { AssetTransformRequest, AssetTransformResult } from './types/media.types.js';

// Image
export type { ImageOutputFormat, ImageDimensions } from './types/image.types.js';
export type { ImageGenerateRequest, ImageGenerateResult } from './types/image.types.js';
export type { ImageEditRequest, ImageEditResult } from './types/image.types.js';
export type { ImageVariantRequest, ImageVariantResult } from './types/image.types.js';
export type { ImageOptimizeRequest, ImageOptimizeResult } from './types/image.types.js';

// Video
export type { VideoOutputFormat, StoryboardScene } from './types/video.types.js';
export type { VideoGenerateRequest, VideoGenerateResult } from './types/video.types.js';
export type { VideoEditRequest, VideoEditResult } from './types/video.types.js';
export type { VideoStoryboardRequest, VideoStoryboardResult } from './types/video.types.js';
export type { VideoThumbnailRequest, VideoThumbnailResult } from './types/video.types.js';

// Audio
export type { AudioOutputFormat } from './types/audio.types.js';
export type { AudioGenerateRequest, AudioGenerateResult } from './types/audio.types.js';
export type { AudioTranscribeRequest, AudioTranscribeResult } from './types/audio.types.js';
export type { AudioSummarizeRequest, AudioSummarizeResult } from './types/audio.types.js';
