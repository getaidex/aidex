import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTENT_SOCIAL_PROMPT_ID } from '../prompts/contentSocialPrompt.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentSocialResult } from '../types/ContentSocial.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString, asStringArray } from '../parsing/coerce.js';

export interface ContentSocialStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseContentSocialResponse(strategyName: string, response: ProviderResponse): ContentSocialResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const content = parsed ? asString(parsed.content) : undefined;
  if (content === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "content" string'
    );
  }

  const hashtagsRaw = parsed?.hashtags;
  const hashtags = Array.isArray(hashtagsRaw) ? asStringArray(hashtagsRaw) : undefined;

  return hashtags !== undefined ? { content, hashtags } : { content };
}

/** Follows ContentRewriteStrategy's established shape exactly — see that class for the full architecture rationale. */
export class ContentSocialStrategy implements Strategy<ContentSocialResult> {
  readonly name = 'content-social';
  readonly version = '1.0.0';

  private readonly pricing?: ContentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContentSocialStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContentSocialResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'topic');

    const topic = input.topic as string;
    const platform = typeof input.platform === 'string' ? input.platform : undefined;
    const tone = typeof input.tone === 'string' ? input.tone : undefined;

    const parts: string[] = [];
    if (platform) {
      parts.push(`write it for ${platform}`);
    }
    if (tone) {
      parts.push(`use a ${tone} tone`);
    }
    const guidance = parts.length > 0 ? ` Please ${parts.join('; ')}.` : '';

    const promptText = this.prompts.render(CONTENT_SOCIAL_PROMPT_ID, { topic, guidance });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseContentSocialResponse(this.name, response);
  }
}
