import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import { VIDEO_GENERATE_PROMPT } from '../prompts/videoGeneratePrompt.js';
import { VideoGenerateStrategy } from '../strategies/VideoGenerateStrategy.js';
import type { VideoGenerateResult } from '../types/video.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface VideoGenerateEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ImageGenerateEngine's established shape exactly — see that class for the full architecture rationale. */
export class VideoGenerateEngine implements Engine<VideoGenerateResult> {
  readonly id = MediaEngineId.VideoGenerate;
  readonly name = 'Video Generate';
  readonly description = 'Generates a new video from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: VideoGenerateStrategy;

  constructor(config: VideoGenerateEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(VIDEO_GENERATE_PROMPT);
    this.strategy = new VideoGenerateStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<VideoGenerateResult> {
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
