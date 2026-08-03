import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CAMPAIGN_CALENDAR_PROMPT_ID } from '../prompts/campaignCalendarPrompt.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { CampaignCalendarEntry, CampaignCalendarResult } from '../types/campaign.types.js';
import type { MarketingChannel } from '../types/marketing.types.js';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { addDays } from '../engines/internal/text.js';
import { readNumber, readStringArray } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asStringArray } from '../parsing/coerce.js';

const DEFAULT_CHANNELS: readonly MarketingChannel[] = ['content'];

export interface CampaignCalendarStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Its own step so parsing is unit-testable independent of any Provider
 * call. `date`/`channel` per entry stay deterministic (computed by the
 * caller from `startDate`/`durationDays`/`channels`, never AI-derived) —
 * only `activity` text comes from the provider, one per day, in order.
 */
export function parseCampaignCalendarResponse(
  strategyName: string,
  response: ProviderResponse,
  startDate: string,
  durationDays: number,
  channels: readonly MarketingChannel[]
): CampaignCalendarResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const activities = parsed ? asStringArray(parsed.activities) : [];
  if (activities.length !== durationDays) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      `expected an "activities" array with exactly ${durationDays} entries, got ${activities.length}`
    );
  }

  const entries: CampaignCalendarEntry[] = activities.map((activity, index) => ({
    date: addDays(startDate, index),
    channel: channels[index % channels.length] as MarketingChannel,
    activity,
  }));

  return { entries };
}

/** Follows CampaignPlanStrategy's established shape exactly — see that class for the full architecture rationale. */
export class CampaignCalendarStrategy implements Strategy<CampaignCalendarResult> {
  readonly name = 'marketing-campaign-calendar';
  readonly version = '1.0.0';

  private readonly pricing?: MarketingEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: CampaignCalendarStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<CampaignCalendarResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'campaignContext');
    assertHasNonEmptyStringField(this.name, input, 'startDate');

    const durationDays = readNumber(input, 'durationDays');
    if (durationDays === undefined || durationDays <= 0) {
      throw new InvalidMarketingEngineInputError(this.name, 'expected a positive "durationDays" number');
    }

    const campaignContext = input.campaignContext as string;
    const startDate = input.startDate as string;
    const channels = (readStringArray(input, 'channels') as MarketingChannel[] | undefined) ?? DEFAULT_CHANNELS;
    const dayCountNote = ` Plan exactly ${durationDays} day(s), one activity per day.`;

    const promptText = this.prompts.render(CAMPAIGN_CALENDAR_PROMPT_ID, { campaignContext, dayCountNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseCampaignCalendarResponse(this.name, response, startDate, durationDays, channels);
  }
}
