import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { ContentEngineId } from '../identifiers.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import { CONTENT_SOCIAL_PROMPT } from '../prompts/contentSocialPrompt.js';
import { ContentSocialStrategy } from '../strategies/ContentSocialStrategy.js';
import type { ContentSocialResult } from '../types/ContentSocial.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface ContentSocialEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ContentRewriteEngine's established shape exactly — see that class for the full architecture rationale. */
export class ContentSocialEngine implements Engine<ContentSocialResult> {
  readonly id = ContentEngineId.Social;
  readonly name = 'Content Social';
  readonly description = 'Generates a social media post from a topic using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ContentSocialStrategy;

  constructor(config: ContentSocialEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CONTENT_SOCIAL_PROMPT);
    this.strategy = new ContentSocialStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ContentSocialResult> {
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
