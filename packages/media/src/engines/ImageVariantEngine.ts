import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import { IMAGE_VARIANT_PROMPT } from '../prompts/imageVariantPrompt.js';
import { ImageVariantStrategy } from '../strategies/ImageVariantStrategy.js';
import type { ImageVariantResult } from '../types/image.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface ImageVariantEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ImageGenerateEngine's established shape exactly — see that class for the full architecture rationale. */
export class ImageVariantEngine implements Engine<ImageVariantResult> {
  readonly id = MediaEngineId.ImageVariant;
  readonly name = 'Image Variant';
  readonly description = 'Generates variants of an existing image.';
  readonly version = '1.0.0';

  private readonly strategy: ImageVariantStrategy;

  constructor(config: ImageVariantEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(IMAGE_VARIANT_PROMPT);
    this.strategy = new ImageVariantStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ImageVariantResult> {
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
