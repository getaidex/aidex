import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { SEO_META_PROMPT_ID } from '../prompts/seoMetaPrompt.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { SeoMetaResult } from '../types/seo.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';

export interface SeoMetaStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseSeoMetaResponse(strategyName: string, response: ProviderResponse): SeoMetaResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const title = parsed ? asString(parsed.title) : undefined;
  const description = parsed ? asString(parsed.description) : undefined;
  if (title === undefined || description === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with "title" and "description" strings'
    );
  }

  return { title, description };
}

/**
 * Follows CampaignPlanStrategy's established shape exactly — see that
 * class for the full architecture rationale. No `brief` requirement,
 * unlike most strategies in this package: `seo.meta` derives meta tags
 * from existing page content, not a fresh creative brief.
 */
export class SeoMetaStrategy implements Strategy<SeoMetaResult> {
  readonly name = 'marketing-seo-meta';
  readonly version = '1.0.0';

  private readonly pricing?: MarketingEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: SeoMetaStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<SeoMetaResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'content');

    const content = input.content as string;
    const targetKeyword = readString(input, 'targetKeyword');
    const keywordNote = targetKeyword ? ` Target the keyword "${targetKeyword}".` : '';

    const promptText = this.prompts.render(SEO_META_PROMPT_ID, { content, keywordNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseSeoMetaResponse(this.name, response);
  }
}
