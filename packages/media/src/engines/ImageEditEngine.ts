import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import { IMAGE_EDIT_PROMPT } from '../prompts/imageEditPrompt.js';
import { ImageEditStrategy } from '../strategies/ImageEditStrategy.js';
import type { ImageEditResult } from '../types/image.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface ImageEditEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ImageGenerateEngine's established shape exactly — see that class for the full architecture rationale. */
export class ImageEditEngine implements Engine<ImageEditResult> {
  readonly id = MediaEngineId.ImageEdit;
  readonly name = 'Image Edit';
  readonly description = 'Edits an existing image according to a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: ImageEditStrategy;

  constructor(config: ImageEditEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(IMAGE_EDIT_PROMPT);
    this.strategy = new ImageEditStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ImageEditResult> {
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
