import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import { SOCIAL_SCHEDULE_PROMPT } from '../prompts/socialSchedulePrompt.js';
import { SocialScheduleStrategy } from '../strategies/SocialScheduleStrategy.js';
import type { SocialScheduleResult } from '../types/social.types.js';
import { assertHasNonEmptyArrayField } from '../validation/assertHasNonEmptyArrayField.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface SocialScheduleEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows CampaignPlanEngine's established shape exactly — see that class
 * for the full architecture rationale. No `brief` requirement, unlike
 * most engines in this package: `social.schedule` arranges already-
 * written posts, not a fresh creative brief.
 */
export class SocialScheduleEngine implements Engine<SocialScheduleResult> {
  readonly id = MarketingEngineId.SocialSchedule;
  readonly name = 'Social Schedule';
  readonly description = 'Plans a publish schedule for a set of already-written social media posts.';
  readonly version = '1.0.0';

  private readonly strategy: SocialScheduleStrategy;

  constructor(config: SocialScheduleEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(SOCIAL_SCHEDULE_PROMPT);
    this.strategy = new SocialScheduleStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<SocialScheduleResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'startDate');
    assertHasNonEmptyArrayField(this.id, input, 'posts');

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
