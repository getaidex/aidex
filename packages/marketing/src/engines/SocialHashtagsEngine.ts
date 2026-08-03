import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import { SOCIAL_HASHTAGS_PROMPT } from '../prompts/socialHashtagsPrompt.js';
import { SocialHashtagsStrategy } from '../strategies/SocialHashtagsStrategy.js';
import type { SocialHashtagsResult } from '../types/social.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface SocialHashtagsEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows CampaignPlanEngine's established shape exactly — see that class for the full architecture rationale. */
export class SocialHashtagsEngine implements Engine<SocialHashtagsResult> {
  readonly id = MarketingEngineId.SocialHashtags;
  readonly name = 'Social Hashtags';
  readonly description = 'Generates a relevant hashtag set for a social media post from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: SocialHashtagsStrategy;

  constructor(config: SocialHashtagsEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(SOCIAL_HASHTAGS_PROMPT);
    this.strategy = new SocialHashtagsStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<SocialHashtagsResult> {
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
