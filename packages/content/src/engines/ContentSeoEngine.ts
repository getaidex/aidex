import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { ContentEngineId } from '../identifiers.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import { CONTENT_SEO_PROMPT } from '../prompts/contentSeoPrompt.js';
import { ContentSeoStrategy } from '../strategies/ContentSeoStrategy.js';
import type { ContentSeoResult } from '../types/ContentSeo.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface ContentSeoEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ContentRewriteEngine's established shape exactly — see that class for the full architecture rationale. */
export class ContentSeoEngine implements Engine<ContentSeoResult> {
  readonly id = ContentEngineId.Seo;
  readonly name = 'Content SEO';
  readonly description = 'SEO-optimizes existing content using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ContentSeoStrategy;

  constructor(config: ContentSeoEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CONTENT_SEO_PROMPT);
    this.strategy = new ContentSeoStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ContentSeoResult> {
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
