import type { FeaturePackage } from '@aidex/sdk';
import { MEDIA_ENGINE_METADATA } from './engines/metadata.js';
import { ImageGenerateEngine } from './engines/ImageGenerateEngine.js';
import { ImageEditEngine } from './engines/ImageEditEngine.js';
import { ImageVariantEngine } from './engines/ImageVariantEngine.js';
import { ImageOptimizeEngine } from './engines/ImageOptimizeEngine.js';
import { VideoGenerateEngine } from './engines/VideoGenerateEngine.js';
import { VideoEditEngine } from './engines/VideoEditEngine.js';
import { VideoStoryboardEngine } from './engines/VideoStoryboardEngine.js';
import { VideoThumbnailEngine } from './engines/VideoThumbnailEngine.js';
import { AudioGenerateEngine } from './engines/AudioGenerateEngine.js';
import { AudioTranscribeEngine } from './engines/AudioTranscribeEngine.js';
import { AudioSummarizeEngine } from './engines/AudioSummarizeEngine.js';
import { AssetConvertEngine } from './engines/AssetConvertEngine.js';
import { AssetTransformEngine } from './engines/AssetTransformEngine.js';
import { IMAGE_GENERATE_PROMPT } from './prompts/imageGeneratePrompt.js';
import { IMAGE_EDIT_PROMPT } from './prompts/imageEditPrompt.js';
import { IMAGE_VARIANT_PROMPT } from './prompts/imageVariantPrompt.js';
import { IMAGE_OPTIMIZE_PROMPT } from './prompts/imageOptimizePrompt.js';
import { VIDEO_GENERATE_PROMPT } from './prompts/videoGeneratePrompt.js';
import { VIDEO_EDIT_PROMPT } from './prompts/videoEditPrompt.js';
import { VIDEO_STORYBOARD_PROMPT } from './prompts/videoStoryboardPrompt.js';
import { VIDEO_THUMBNAIL_PROMPT } from './prompts/videoThumbnailPrompt.js';
import { AUDIO_GENERATE_PROMPT } from './prompts/audioGeneratePrompt.js';
import { AUDIO_TRANSCRIBE_PROMPT } from './prompts/audioTranscribePrompt.js';
import { AUDIO_SUMMARIZE_PROMPT } from './prompts/audioSummarizePrompt.js';
import { ASSET_CONVERT_PROMPT } from './prompts/assetConvertPrompt.js';
import { ASSET_TRANSFORM_PROMPT } from './prompts/assetTransformPrompt.js';
import { ImageEnhancementWorkflow } from './workflows/ImageEnhancementWorkflow.js';
import { VideoPreparationWorkflow } from './workflows/VideoPreparationWorkflow.js';
import { AudioProcessingWorkflow } from './workflows/AudioProcessingWorkflow.js';

export type MediaWorkflow = ImageEnhancementWorkflow | VideoPreparationWorkflow | AudioProcessingWorkflow;

/**
 * @aidex/media's complete manifest — every engine is a singleton,
 * constructed once here and shared across every EngineRegistry that
 * registers it via AIBuilder.use(MEDIA_FEATURE_PACKAGE). Engines must
 * stay stateless: all execution state belongs on ExecutionContext, never
 * on the engine instance. `workflows` is pass-through only — never
 * registered anywhere by AIBuilder.use(); call each workflow's own
 * `.run(input, provider, options)` directly.
 */
export const MEDIA_FEATURE_PACKAGE: FeaturePackage<MediaWorkflow> = {
  name: '@aidex/media',
  version: '0.2.0-alpha',
  engines: [
    new ImageGenerateEngine(),
    new ImageEditEngine(),
    new ImageVariantEngine(),
    new ImageOptimizeEngine(),
    new VideoGenerateEngine(),
    new VideoEditEngine(),
    new VideoStoryboardEngine(),
    new VideoThumbnailEngine(),
    new AudioGenerateEngine(),
    new AudioTranscribeEngine(),
    new AudioSummarizeEngine(),
    new AssetConvertEngine(),
    new AssetTransformEngine(),
  ],
  prompts: [
    IMAGE_GENERATE_PROMPT,
    IMAGE_EDIT_PROMPT,
    IMAGE_VARIANT_PROMPT,
    IMAGE_OPTIMIZE_PROMPT,
    VIDEO_GENERATE_PROMPT,
    VIDEO_EDIT_PROMPT,
    VIDEO_STORYBOARD_PROMPT,
    VIDEO_THUMBNAIL_PROMPT,
    AUDIO_GENERATE_PROMPT,
    AUDIO_TRANSCRIBE_PROMPT,
    AUDIO_SUMMARIZE_PROMPT,
    ASSET_CONVERT_PROMPT,
    ASSET_TRANSFORM_PROMPT,
  ],
  metadata: MEDIA_ENGINE_METADATA,
  workflows: [
    new ImageEnhancementWorkflow(),
    new VideoPreparationWorkflow(),
    new AudioProcessingWorkflow(),
  ],
};
