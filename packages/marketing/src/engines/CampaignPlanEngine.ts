import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import { CAMPAIGN_PLAN_PROMPT } from '../prompts/campaignPlanPrompt.js';
import { CampaignPlanStrategy } from '../strategies/CampaignPlanStrategy.js';
import type { CampaignPlanResult } from '../types/campaign.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface CampaignPlanEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Phase 3: AI-backed. Owns a private PromptRegistry (this engine's one
 * prompt, registered once at construction) and a CampaignPlanStrategy
 * built from it, then on execute(): validates input, then calls
 * `strategy.execute(request, context)` directly — the exact two-argument
 * contract `@aidex/core`'s own `Aidex.execute()` uses to dispatch a
 * Strategy, so this engine composes with the platform the same way
 * `DesignBrandEngine`/`ImageGenerateEngine` do. The Strategy — not this
 * Engine — owns prompt rendering, the actual Provider call, response
 * parsing, and observability.
 */
export class CampaignPlanEngine implements Engine<CampaignPlanResult> {
  readonly id = MarketingEngineId.CampaignPlan;
  readonly name = 'Campaign Plan';
  readonly description = 'Plans a marketing campaign — objectives, channels, and summary — from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: CampaignPlanStrategy;

  constructor(config: CampaignPlanEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CAMPAIGN_PLAN_PROMPT);
    this.strategy = new CampaignPlanStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<CampaignPlanResult> {
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
