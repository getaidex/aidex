import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import { VIDEO_EDIT_PROMPT } from '../prompts/videoEditPrompt.js';
import { VideoEditStrategy } from '../strategies/VideoEditStrategy.js';
import type { VideoEditResult } from '../types/video.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface VideoEditEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ImageGenerateEngine's established shape exactly — see that class for the full architecture rationale. */
export class VideoEditEngine implements Engine<VideoEditResult> {
  readonly id = MediaEngineId.VideoEdit;
  readonly name = 'Video Edit';
  readonly description = 'Edits an existing video according to a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: VideoEditStrategy;

  constructor(config: VideoEditEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(VIDEO_EDIT_PROMPT);
    this.strategy = new VideoEditStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<VideoEditResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'brief');
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
