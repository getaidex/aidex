import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { ContentEngineId } from '../identifiers.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import { CONTENT_PRODUCT_DESCRIPTION_PROMPT } from '../prompts/contentProductDescriptionPrompt.js';
import { ContentProductDescriptionStrategy } from '../strategies/ContentProductDescriptionStrategy.js';
import type { ContentProductDescriptionResult } from '../types/ContentProductDescription.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface ContentProductDescriptionEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ContentRewriteEngine's established shape exactly — see that class for the full architecture rationale. */
export class ContentProductDescriptionEngine implements Engine<ContentProductDescriptionResult> {
  readonly id = ContentEngineId.ProductDescription;
  readonly name = 'Content Product Description';
  readonly description = 'Generates a product description using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ContentProductDescriptionStrategy;

  constructor(config: ContentProductDescriptionEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CONTENT_PRODUCT_DESCRIPTION_PROMPT);
    this.strategy = new ContentProductDescriptionStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ContentProductDescriptionResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'productName');

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
