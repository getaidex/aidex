import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { ANALYTICS_SUMMARY_PROMPT_ID } from '../prompts/analyticsSummaryPrompt.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { AnalyticsSummaryResult, MetricPoint } from '../types/analytics.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyArrayField } from '../validation/assertHasNonEmptyArrayField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString, asStringArray } from '../parsing/coerce.js';

export interface AnalyticsSummaryStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseAnalyticsSummaryResponse(
  strategyName: string,
  response: ProviderResponse
): AnalyticsSummaryResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const summary = parsed ? asString(parsed.summary) : undefined;
  if (summary === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "summary" string'
    );
  }

  return { summary, highlights: parsed ? asStringArray(parsed.highlights) : [] };
}

/**
 * Follows CampaignPlanStrategy's established shape exactly — see that
 * class for the full architecture rationale. No `brief` requirement,
 * unlike most strategies in this package: `analytics.summary` operates
 * on existing metrics data, not a fresh creative brief.
 */
export class AnalyticsSummaryStrategy implements Strategy<AnalyticsSummaryResult> {
  readonly name = 'marketing-analytics-summary';
  readonly version = '1.0.0';

  private readonly pricing?: MarketingEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: AnalyticsSummaryStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<AnalyticsSummaryResult> {
    const input = request.input;
    assertHasNonEmptyArrayField(this.name, input, 'metrics');

    const metrics = input.metrics as MetricPoint[];
    const periodLabel = readString(input, 'periodLabel');
    const metricsList = metrics.map((metric) => `${metric.name}: ${metric.value}`).join('\n');
    const periodNote = periodLabel ? ` The period is ${periodLabel}.` : '';

    const promptText = this.prompts.render(ANALYTICS_SUMMARY_PROMPT_ID, { metricsList, periodNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseAnalyticsSummaryResponse(this.name, response);
  }
}
