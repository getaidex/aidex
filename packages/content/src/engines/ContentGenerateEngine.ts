import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { ContentEngineId } from '../identifiers.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import { CONTENT_GENERATE_PROMPT } from '../prompts/contentGeneratePrompt.js';
import { ContentGenerateStrategy } from '../strategies/ContentGenerateStrategy.js';
import type { ContentGenerateResult } from '../types/ContentGenerate.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface ContentGenerateEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ContentRewriteEngine's established shape exactly — see that class for the full architecture rationale. */
export class ContentGenerateEngine implements Engine<ContentGenerateResult> {
  readonly id = ContentEngineId.Generate;
  readonly name = 'Content Generate';
  readonly description = 'Generates new content from a topic using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ContentGenerateStrategy;

  constructor(config: ContentGenerateEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CONTENT_GENERATE_PROMPT);
    this.strategy = new ContentGenerateStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ContentGenerateResult> {
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
