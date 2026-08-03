import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import { SOCIAL_CAPTION_PROMPT } from '../prompts/socialCaptionPrompt.js';
import { SocialCaptionStrategy } from '../strategies/SocialCaptionStrategy.js';
import type { SocialCaptionResult } from '../types/social.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface SocialCaptionEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows CampaignPlanEngine's established shape exactly — see that class for the full architecture rationale. */
export class SocialCaptionEngine implements Engine<SocialCaptionResult> {
  readonly id = MarketingEngineId.SocialCaption;
  readonly name = 'Social Caption';
  readonly description = 'Generates a social media post caption from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: SocialCaptionStrategy;

  constructor(config: SocialCaptionEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(SOCIAL_CAPTION_PROMPT);
    this.strategy = new SocialCaptionStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<SocialCaptionResult> {
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
