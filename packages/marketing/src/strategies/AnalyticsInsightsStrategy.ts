import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { ANALYTICS_INSIGHTS_PROMPT_ID } from '../prompts/analyticsInsightsPrompt.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { AnalyticsInsight, AnalyticsInsightsResult, MetricPoint } from '../types/analytics.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyArrayField } from '../validation/assertHasNonEmptyArrayField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asRecordArray, asString } from '../parsing/coerce.js';

export interface AnalyticsInsightsStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseAnalyticsInsightsResponse(
  strategyName: string,
  response: ProviderResponse
): AnalyticsInsightsResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const insightRecords = parsed ? asRecordArray(parsed.insights) : [];
  if (insightRecords.length === 0) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a non-empty "insights" array'
    );
  }

  const insights: AnalyticsInsight[] = insightRecords.map((entry) => {
    const observation = asString(entry.observation);
    const recommendation = asString(entry.recommendation);
    if (observation === undefined || recommendation === undefined) {
      throw new UnparsableProviderResponseError(
        strategyName,
        response.content,
        'expected every insight to have "observation" and "recommendation" strings'
      );
    }
    return { observation, recommendation };
  });

  return { insights };
}

/**
 * Follows CampaignPlanStrategy's established shape exactly — see that
 * class for the full architecture rationale. No `brief` requirement,
 * unlike most strategies in this package: `analytics.insights` operates
 * on existing metrics data, not a fresh creative brief.
 */
export class AnalyticsInsightsStrategy implements Strategy<AnalyticsInsightsResult> {
  readonly name = 'marketing-analytics-insights';
  readonly version = '1.0.0';

  private readonly pricing?: MarketingEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: AnalyticsInsightsStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<AnalyticsInsightsResult> {
    const input = request.input;
    assertHasNonEmptyArrayField(this.name, input, 'metrics');

    const metrics = input.metrics as MetricPoint[];
    const goal = readString(input, 'goal');
    const metricsList = metrics.map((metric) => `${metric.name}: ${metric.value}`).join('\n');
    const goalNote = goal ? ` The goal is ${goal}.` : '';

    const promptText = this.prompts.render(ANALYTICS_INSIGHTS_PROMPT_ID, { metricsList, goalNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseAnalyticsInsightsResponse(this.name, response);
  }
}
