import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import { IMAGE_GENERATE_PROMPT } from '../prompts/imageGeneratePrompt.js';
import { ImageGenerateStrategy } from '../strategies/ImageGenerateStrategy.js';
import type { ImageGenerateResult } from '../types/image.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface ImageGenerateEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Phase 3: AI-backed. Owns a private PromptRegistry (this engine's one
 * prompt, registered once at construction) and an ImageGenerateStrategy
 * built from it, then on execute(): validates input, then calls
 * `strategy.execute(request, context)` directly — the exact two-argument
 * contract `@aidex/core`'s own `Aidex.execute()` uses to dispatch a
 * Strategy, so this engine composes with the platform the same way
 * `DesignBrandEngine`/`ContentRewriteEngine` do. The Strategy — not this
 * Engine — owns prompt rendering, the actual Provider call, response
 * parsing, and observability.
 */
export class ImageGenerateEngine implements Engine<ImageGenerateResult> {
  readonly id = MediaEngineId.ImageGenerate;
  readonly name = 'Image Generate';
  readonly description = 'Generates a new image from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: ImageGenerateStrategy;

  constructor(config: ImageGenerateEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(IMAGE_GENERATE_PROMPT);
    this.strategy = new ImageGenerateStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ImageGenerateResult> {
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
