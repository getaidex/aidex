import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { SOCIAL_HASHTAGS_PROMPT_ID } from '../prompts/socialHashtagsPrompt.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { SocialHashtagsResult } from '../types/social.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readNumber, readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asStringArray } from '../parsing/coerce.js';
import { buildAudienceNote } from './buildAudienceNote.js';

export interface SocialHashtagsStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseSocialHashtagsResponse(
  strategyName: string,
  response: ProviderResponse
): SocialHashtagsResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const hashtags = parsed ? asStringArray(parsed.hashtags) : [];
  if (hashtags.length === 0) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a non-empty "hashtags" array'
    );
  }

  return { hashtags };
}

/** Follows CampaignPlanStrategy's established shape exactly — see that class for the full architecture rationale. */
export class SocialHashtagsStrategy implements Strategy<SocialHashtagsResult> {
  readonly name = 'marketing-social-hashtags';
  readonly version = '1.0.0';

  private readonly pricing?: MarketingEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: SocialHashtagsStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<SocialHashtagsResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const platform = readString(input, 'platform');
    const count = readNumber(input, 'count');
    const audienceNote = buildAudienceNote(input.targetAudience as string | undefined);
    const platformNote = platform ? ` Write it for ${platform}.` : '';
    const countNote = count && count > 0 ? ` Provide exactly ${count} hashtag(s).` : '';

    const promptText = this.prompts.render(SOCIAL_HASHTAGS_PROMPT_ID, {
      brief,
      audienceNote,
      platformNote,
      countNote,
    });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseSocialHashtagsResponse(this.name, response);
  }
}
