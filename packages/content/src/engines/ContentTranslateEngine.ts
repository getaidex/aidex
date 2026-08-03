import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { ContentEngineId } from '../identifiers.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import { CONTENT_TRANSLATE_PROMPT } from '../prompts/contentTranslatePrompt.js';
import { ContentTranslateStrategy } from '../strategies/ContentTranslateStrategy.js';
import type { ContentTranslateResult } from '../types/ContentTranslate.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface ContentTranslateEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ContentRewriteEngine's established shape exactly — see that class for the full architecture rationale. */
export class ContentTranslateEngine implements Engine<ContentTranslateResult> {
  readonly id = ContentEngineId.Translate;
  readonly name = 'Content Translate';
  readonly description = 'Translates content into a target language using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ContentTranslateStrategy;

  constructor(config: ContentTranslateEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CONTENT_TRANSLATE_PROMPT);
    this.strategy = new ContentTranslateStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ContentTranslateResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'content');
    assertHasNonEmptyStringField(this.id, input, 'targetLanguage');

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
