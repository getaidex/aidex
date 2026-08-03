import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTENT_PRODUCT_DESCRIPTION_PROMPT_ID } from '../prompts/contentProductDescriptionPrompt.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentProductDescriptionResult } from '../types/ContentProductDescription.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { asStringArray } from '../parsing/coerce.js';

export interface ContentProductDescriptionStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

export function parseContentProductDescriptionResponse(
  response: ProviderResponse
): ContentProductDescriptionResult {
  return { description: response.content.trim() };
}

/** Follows ContentRewriteStrategy's established shape exactly — see that class for the full architecture rationale. */
export class ContentProductDescriptionStrategy implements Strategy<ContentProductDescriptionResult> {
  readonly name = 'content-product-description';
  readonly version = '1.0.0';

  private readonly pricing?: ContentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContentProductDescriptionStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContentProductDescriptionResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'productName');

    const productName = input.productName as string;
    const features = asStringArray(input.features);
    const tone = typeof input.tone === 'string' ? input.tone : undefined;

    const parts: string[] = [];
    if (features.length > 0) {
      parts.push(`highlight these features: ${features.join(', ')}`);
    }
    if (tone) {
      parts.push(`use a ${tone} tone`);
    }
    const guidance = parts.length > 0 ? ` Please ${parts.join('; ')}.` : '';

    const promptText = this.prompts.render(CONTENT_PRODUCT_DESCRIPTION_PROMPT_ID, {
      productName,
      guidance,
    });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseContentProductDescriptionResponse(response);
  }
}
