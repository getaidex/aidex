import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import { VIDEO_THUMBNAIL_PROMPT } from '../prompts/videoThumbnailPrompt.js';
import { VideoThumbnailStrategy } from '../strategies/VideoThumbnailStrategy.js';
import type { VideoThumbnailResult } from '../types/video.types.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface VideoThumbnailEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows ImageGenerateEngine's established shape exactly — see that class
 * for the full architecture rationale. No `brief` requirement, unlike most
 * engines in this package: `video.thumbnail` is purely parametric.
 */
export class VideoThumbnailEngine implements Engine<VideoThumbnailResult> {
  readonly id = MediaEngineId.VideoThumbnail;
  readonly name = 'Video Thumbnail';
  readonly description = 'Extracts a thumbnail image from an existing video.';
  readonly version = '1.0.0';

  private readonly strategy: VideoThumbnailStrategy;

  constructor(config: VideoThumbnailEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(VIDEO_THUMBNAIL_PROMPT);
    this.strategy = new VideoThumbnailStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<VideoThumbnailResult> {
    const input = context.request?.input;
    assertHasValidSource(this.id, input);

    return this.strategy.execute(
      {
        strategy: this.strategy.name,
        input,
        metadata: context.request?.metadata,
        options: context.request?.options,
      },
      context
    );
  }
}
