import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import { CAMPAIGN_BRIEF_PROMPT } from '../prompts/campaignBriefPrompt.js';
import { CampaignBriefStrategy } from '../strategies/CampaignBriefStrategy.js';
import type { CampaignBriefResult } from '../types/campaign.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface CampaignBriefEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows CampaignPlanEngine's established shape exactly — see that class for the full architecture rationale. */
export class CampaignBriefEngine implements Engine<CampaignBriefResult> {
  readonly id = MarketingEngineId.CampaignBrief;
  readonly name = 'Campaign Brief';
  readonly description = 'Generates a formal campaign brief document from a raw creative idea.';
  readonly version = '1.0.0';

  private readonly strategy: CampaignBriefStrategy;

  constructor(config: CampaignBriefEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CAMPAIGN_BRIEF_PROMPT);
    this.strategy = new CampaignBriefStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<CampaignBriefResult> {
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
