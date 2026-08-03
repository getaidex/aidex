import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import { VIDEO_STORYBOARD_PROMPT } from '../prompts/videoStoryboardPrompt.js';
import { VideoStoryboardStrategy } from '../strategies/VideoStoryboardStrategy.js';
import type { VideoStoryboardResult } from '../types/video.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface VideoStoryboardEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ImageGenerateEngine's established shape exactly — see that class for the full architecture rationale. */
export class VideoStoryboardEngine implements Engine<VideoStoryboardResult> {
  readonly id = MediaEngineId.VideoStoryboard;
  readonly name = 'Video Storyboard';
  readonly description = 'Generates a scene-by-scene storyboard from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: VideoStoryboardStrategy;

  constructor(config: VideoStoryboardEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(VIDEO_STORYBOARD_PROMPT);
    this.strategy = new VideoStoryboardStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<VideoStoryboardResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'brief');

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
