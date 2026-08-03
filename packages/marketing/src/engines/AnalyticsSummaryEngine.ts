import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import { ANALYTICS_SUMMARY_PROMPT } from '../prompts/analyticsSummaryPrompt.js';
import { AnalyticsSummaryStrategy } from '../strategies/AnalyticsSummaryStrategy.js';
import type { AnalyticsSummaryResult } from '../types/analytics.types.js';
import { assertHasNonEmptyArrayField } from '../validation/assertHasNonEmptyArrayField.js';

export interface AnalyticsSummaryEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows CampaignPlanEngine's established shape exactly — see that class
 * for the full architecture rationale. No `brief` requirement, unlike
 * most engines in this package: `analytics.summary` operates on existing
 * metrics data, not a fresh creative brief.
 */
export class AnalyticsSummaryEngine implements Engine<AnalyticsSummaryResult> {
  readonly id = MarketingEngineId.AnalyticsSummary;
  readonly name = 'Analytics Summary';
  readonly description = 'Summarizes a set of marketing metrics into a short narrative summary with highlights.';
  readonly version = '1.0.0';

  private readonly strategy: AnalyticsSummaryStrategy;

  constructor(config: AnalyticsSummaryEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(ANALYTICS_SUMMARY_PROMPT);
    this.strategy = new AnalyticsSummaryStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<AnalyticsSummaryResult> {
    const input = context.request?.input;
    assertHasNonEmptyArrayField(this.id, input, 'metrics');

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
