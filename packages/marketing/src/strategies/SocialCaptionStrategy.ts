import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { SOCIAL_CAPTION_PROMPT_ID } from '../prompts/socialCaptionPrompt.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { SocialCaptionResult } from '../types/social.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';
import { buildAudienceNote } from './buildAudienceNote.js';

export interface SocialCaptionStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseSocialCaptionResponse(strategyName: string, response: ProviderResponse): SocialCaptionResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const caption = parsed ? asString(parsed.caption) : undefined;
  if (caption === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "caption" string'
    );
  }

  return { caption };
}

/** Follows CampaignPlanStrategy's established shape exactly — see that class for the full architecture rationale. */
export class SocialCaptionStrategy implements Strategy<SocialCaptionResult> {
  readonly name = 'marketing-social-caption';
  readonly version = '1.0.0';

  private readonly pricing?: MarketingEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: SocialCaptionStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<SocialCaptionResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const platform = readString(input, 'platform');
    const audienceNote = buildAudienceNote(input.targetAudience as string | undefined);
    const platformNote = platform ? ` Write it for ${platform}.` : '';

    const promptText = this.prompts.render(SOCIAL_CAPTION_PROMPT_ID, { brief, audienceNote, platformNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseSocialCaptionResponse(this.name, response);
  }
}
