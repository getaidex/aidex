import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { ContentEngineId } from '../identifiers.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import { CONTENT_HEADLINE_PROMPT } from '../prompts/contentHeadlinePrompt.js';
import { ContentHeadlineStrategy } from '../strategies/ContentHeadlineStrategy.js';
import type { ContentHeadlineResult } from '../types/ContentHeadline.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface ContentHeadlineEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ContentRewriteEngine's established shape exactly — see that class for the full architecture rationale. */
export class ContentHeadlineEngine implements Engine<ContentHeadlineResult> {
  readonly id = ContentEngineId.Headline;
  readonly name = 'Content Headline';
  readonly description = 'Generates headline variants for a topic using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ContentHeadlineStrategy;

  constructor(config: ContentHeadlineEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CONTENT_HEADLINE_PROMPT);
    this.strategy = new ContentHeadlineStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ContentHeadlineResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'topic');

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
