import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import { IMAGE_OPTIMIZE_PROMPT } from '../prompts/imageOptimizePrompt.js';
import { ImageOptimizeStrategy } from '../strategies/ImageOptimizeStrategy.js';
import type { ImageOptimizeResult } from '../types/image.types.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface ImageOptimizeEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows ImageGenerateEngine's established shape exactly — see that class
 * for the full architecture rationale. No `brief` requirement, unlike most
 * engines in this package: `image.optimize` is purely parametric.
 */
export class ImageOptimizeEngine implements Engine<ImageOptimizeResult> {
  readonly id = MediaEngineId.ImageOptimize;
  readonly name = 'Image Optimize';
  readonly description = 'Optimizes an existing image for file size and/or format.';
  readonly version = '1.0.0';

  private readonly strategy: ImageOptimizeStrategy;

  constructor(config: ImageOptimizeEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(IMAGE_OPTIMIZE_PROMPT);
    this.strategy = new ImageOptimizeStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ImageOptimizeResult> {
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
