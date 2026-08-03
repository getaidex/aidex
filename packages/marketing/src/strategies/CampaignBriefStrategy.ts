import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CAMPAIGN_BRIEF_PROMPT_ID } from '../prompts/campaignBriefPrompt.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { CampaignBriefResult } from '../types/campaign.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString, asStringArray } from '../parsing/coerce.js';
import { buildAudienceNote } from './buildAudienceNote.js';

export interface CampaignBriefStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseCampaignBriefResponse(strategyName: string, response: ProviderResponse): CampaignBriefResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const document = parsed ? asString(parsed.document) : undefined;
  if (document === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "document" string'
    );
  }

  return { document, objectives: parsed ? asStringArray(parsed.objectives) : [] };
}

/** Follows CampaignPlanStrategy's established shape exactly — see that class for the full architecture rationale. */
export class CampaignBriefStrategy implements Strategy<CampaignBriefResult> {
  readonly name = 'marketing-campaign-brief';
  readonly version = '1.0.0';

  private readonly pricing?: MarketingEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: CampaignBriefStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<CampaignBriefResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const product = readString(input, 'product');
    const audienceNote = buildAudienceNote(input.targetAudience as string | undefined);
    const productNote = product ? ` The product is ${product}.` : '';

    const promptText = this.prompts.render(CAMPAIGN_BRIEF_PROMPT_ID, { brief, audienceNote, productNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseCampaignBriefResponse(this.name, response);
  }
}
