import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTENT_TAGLINE_PROMPT_ID } from '../prompts/contentTaglinePrompt.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentTaglineResult } from '../types/ContentTagline.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseRequiredStringArrayField } from '../parsing/parseRequiredStringArrayField.js';

export interface ContentTaglineStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseContentTaglineResponse(
  strategyName: string,
  response: ProviderResponse
): ContentTaglineResult {
  return { taglines: parseRequiredStringArrayField(strategyName, response.content, 'taglines') };
}

/** Follows ContentRewriteStrategy's established shape exactly — see that class for the full architecture rationale. */
export class ContentTaglineStrategy implements Strategy<ContentTaglineResult> {
  readonly name = 'content-tagline';
  readonly version = '1.0.0';

  private readonly pricing?: ContentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContentTaglineStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContentTaglineResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brandName');

    const brandName = input.brandName as string;
    const description = typeof input.description === 'string' ? input.description : undefined;
    const count = typeof input.count === 'number' ? input.count : undefined;

    const promptText = this.prompts.render(CONTENT_TAGLINE_PROMPT_ID, {
      brandName,
      count: count !== undefined ? String(count) : 'a few',
      descriptionNote: description !== undefined ? ` About the brand: ${description}.` : '',
    });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseContentTaglineResponse(this.name, response);
  }
}
