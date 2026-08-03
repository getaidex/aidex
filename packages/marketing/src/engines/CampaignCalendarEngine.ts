import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { MarketingEngineId } from '../identifiers.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import { CAMPAIGN_CALENDAR_PROMPT } from '../prompts/campaignCalendarPrompt.js';
import { CampaignCalendarStrategy } from '../strategies/CampaignCalendarStrategy.js';
import type { CampaignCalendarResult } from '../types/campaign.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { readNumber } from './internal/readField.js';

export interface CampaignCalendarEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows CampaignPlanEngine's established shape exactly — see that class
 * for the full architecture rationale. No `brief` requirement, unlike
 * most engines in this package: `campaign.calendar` is derived from an
 * already-planned campaign (`campaignContext`), not a fresh creative
 * brief.
 */
export class CampaignCalendarEngine implements Engine<CampaignCalendarResult> {
  readonly id = MarketingEngineId.CampaignCalendar;
  readonly name = 'Campaign Calendar';
  readonly description = 'Plans a day-by-day content and activity calendar for an already-planned campaign.';
  readonly version = '1.0.0';

  private readonly strategy: CampaignCalendarStrategy;

  constructor(config: CampaignCalendarEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CAMPAIGN_CALENDAR_PROMPT);
    this.strategy = new CampaignCalendarStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<CampaignCalendarResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'campaignContext');
    assertHasNonEmptyStringField(this.id, input, 'startDate');

    const durationDays = readNumber(input, 'durationDays');
    if (durationDays === undefined || durationDays <= 0) {
      throw new InvalidMarketingEngineInputError(this.id, 'expected a positive "durationDays" number');
    }

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
