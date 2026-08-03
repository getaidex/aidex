import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { ContentEngineId } from '../identifiers.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import { CONTENT_SUMMARIZE_PROMPT } from '../prompts/contentSummarizePrompt.js';
import { ContentSummarizeStrategy } from '../strategies/ContentSummarizeStrategy.js';
import type { ContentSummarizeResult } from '../types/ContentSummarize.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface ContentSummarizeEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ContentRewriteEngine's established shape exactly — see that class for the full architecture rationale. */
export class ContentSummarizeEngine implements Engine<ContentSummarizeResult> {
  readonly id = ContentEngineId.Summarize;
  readonly name = 'Content Summarize';
  readonly description = 'Summarizes existing content using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ContentSummarizeStrategy;

  constructor(config: ContentSummarizeEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CONTENT_SUMMARIZE_PROMPT);
    this.strategy = new ContentSummarizeStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ContentSummarizeResult> {
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
