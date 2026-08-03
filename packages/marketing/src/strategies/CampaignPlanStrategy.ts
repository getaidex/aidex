import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CAMPAIGN_PLAN_PROMPT_ID } from '../prompts/campaignPlanPrompt.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { CampaignObjective, CampaignPlanResult } from '../types/campaign.types.js';
import type { MarketingChannel } from '../types/marketing.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readStringArray } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asRecordArray, asString } from '../parsing/coerce.js';
import { buildAudienceNote } from './buildAudienceNote.js';

const DEFAULT_CHANNELS: readonly MarketingChannel[] = ['content'];

export interface CampaignPlanStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseCampaignPlanResponse(
  strategyName: string,
  response: ProviderResponse,
  channels: readonly MarketingChannel[]
): CampaignPlanResult {
  const record = asRecord(parseJsonResponse(strategyName, response.content));
  const objectiveRecords = record ? asRecordArray(record.objectives) : [];
  if (objectiveRecords.length === 0) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a non-empty "objectives" array'
    );
  }

  const summary = record ? asString(record.summary) : undefined;
  if (summary === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "summary" string'
    );
  }

  const objectives: CampaignObjective[] = objectiveRecords.map((entry) => {
    const goal = asString(entry.goal);
    if (goal === undefined) {
      throw new UnparsableProviderResponseError(
        strategyName,
        response.content,
        'expected every objective to have a "goal" string'
      );
    }
    const metric = asString(entry.metric);
    return { goal, ...(metric !== undefined ? { metric } : {}) };
  });

  return { objectives, channels, summary };
}

/**
 * Renders the registered `marketing.campaign.plan` prompt, calls
 * whichever Provider context.provider holds, and parses the response
 * into CampaignPlanResult. Follows @aidex/design's DesignBrandStrategy
 * shape exactly — see that class for the full architecture rationale.
 * `channels` stays deterministic (from input or a default), never
 * AI-derived — the same split @aidex/media's `image.optimize` established
 * for its own deterministic fields.
 */
export class CampaignPlanStrategy implements Strategy<CampaignPlanResult> {
  readonly name = 'marketing-campaign-plan';
  readonly version = '1.0.0';

  private readonly pricing?: MarketingEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: CampaignPlanStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<CampaignPlanResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const channels = (readStringArray(input, 'channels') as MarketingChannel[] | undefined) ?? DEFAULT_CHANNELS;
    const audienceNote = buildAudienceNote(input.targetAudience as string | undefined);

    const promptText = this.prompts.render(CAMPAIGN_PLAN_PROMPT_ID, { brief, audienceNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseCampaignPlanResponse(this.name, response, channels);
  }
}
