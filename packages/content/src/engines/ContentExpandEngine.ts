import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { ContentEngineId } from '../identifiers.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import { CONTENT_EXPAND_PROMPT } from '../prompts/contentExpandPrompt.js';
import { ContentExpandStrategy } from '../strategies/ContentExpandStrategy.js';
import type { ContentExpandResult } from '../types/ContentExpand.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface ContentExpandEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ContentRewriteEngine's established shape exactly — see that class for the full architecture rationale. */
export class ContentExpandEngine implements Engine<ContentExpandResult> {
  readonly id = ContentEngineId.Expand;
  readonly name = 'Content Expand';
  readonly description = 'Expands existing content with more detail using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ContentExpandStrategy;

  constructor(config: ContentExpandEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CONTENT_EXPAND_PROMPT);
    this.strategy = new ContentExpandStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ContentExpandResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'content');

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
