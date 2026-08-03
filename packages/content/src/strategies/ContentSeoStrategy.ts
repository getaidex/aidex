import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTENT_SEO_PROMPT_ID } from '../prompts/contentSeoPrompt.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentSeoResult } from '../types/ContentSeo.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString, asStringArray } from '../parsing/coerce.js';

export interface ContentSeoStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseContentSeoResponse(strategyName: string, response: ProviderResponse): ContentSeoResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const optimizedContent = parsed ? asString(parsed.optimizedContent) : undefined;
  if (optimizedContent === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with an "optimizedContent" string'
    );
  }

  const suggestedKeywordsRaw = parsed?.suggestedKeywords;
  const suggestedKeywords = Array.isArray(suggestedKeywordsRaw) ? asStringArray(suggestedKeywordsRaw) : undefined;
  const metaDescription = parsed ? asString(parsed.metaDescription) : undefined;

  return {
    optimizedContent,
    ...(suggestedKeywords !== undefined ? { suggestedKeywords } : {}),
    ...(metaDescription !== undefined ? { metaDescription } : {}),
  };
}

/** Follows ContentRewriteStrategy's established shape exactly — see that class for the full architecture rationale. */
export class ContentSeoStrategy implements Strategy<ContentSeoResult> {
  readonly name = 'content-seo';
  readonly version = '1.0.0';

  private readonly pricing?: ContentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContentSeoStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContentSeoResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'content');

    const content = input.content as string;
    const targetKeywords = asStringArray(input.targetKeywords);

    const promptText = this.prompts.render(CONTENT_SEO_PROMPT_ID, {
      content,
      targetKeywordsNote:
        targetKeywords.length > 0 ? ` Target these keywords: ${targetKeywords.join(', ')}.` : '',
    });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseContentSeoResponse(this.name, response);
  }
}
