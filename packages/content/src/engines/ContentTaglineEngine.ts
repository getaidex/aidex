import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { ContentEngineId } from '../identifiers.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import { CONTENT_TAGLINE_PROMPT } from '../prompts/contentTaglinePrompt.js';
import { ContentTaglineStrategy } from '../strategies/ContentTaglineStrategy.js';
import type { ContentTaglineResult } from '../types/ContentTagline.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface ContentTaglineEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ContentRewriteEngine's established shape exactly — see that class for the full architecture rationale. */
export class ContentTaglineEngine implements Engine<ContentTaglineResult> {
  readonly id = ContentEngineId.Tagline;
  readonly name = 'Content Tagline';
  readonly description = 'Generates tagline variants for a brand using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ContentTaglineStrategy;

  constructor(config: ContentTaglineEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CONTENT_TAGLINE_PROMPT);
    this.strategy = new ContentTaglineStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ContentTaglineResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'brandName');

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
