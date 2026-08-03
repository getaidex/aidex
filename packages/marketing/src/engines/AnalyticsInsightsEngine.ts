import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import { ANALYTICS_INSIGHTS_PROMPT } from '../prompts/analyticsInsightsPrompt.js';
import { AnalyticsInsightsStrategy } from '../strategies/AnalyticsInsightsStrategy.js';
import type { AnalyticsInsightsResult } from '../types/analytics.types.js';
import { assertHasNonEmptyArrayField } from '../validation/assertHasNonEmptyArrayField.js';

export interface AnalyticsInsightsEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows CampaignPlanEngine's established shape exactly — see that class
 * for the full architecture rationale. No `brief` requirement, unlike
 * most engines in this package: `analytics.insights` operates on existing
 * metrics data, not a fresh creative brief.
 */
export class AnalyticsInsightsEngine implements Engine<AnalyticsInsightsResult> {
  readonly id = MarketingEngineId.AnalyticsInsights;
  readonly name = 'Analytics Insights';
  readonly description = 'Derives actionable insights and recommendations from a set of marketing metrics.';
  readonly version = '1.0.0';

  private readonly strategy: AnalyticsInsightsStrategy;

  constructor(config: AnalyticsInsightsEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(ANALYTICS_INSIGHTS_PROMPT);
    this.strategy = new AnalyticsInsightsStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<AnalyticsInsightsResult> {
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
