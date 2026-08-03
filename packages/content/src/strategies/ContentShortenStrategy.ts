import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTENT_SHORTEN_PROMPT_ID } from '../prompts/contentShortenPrompt.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentShortenResult } from '../types/ContentShorten.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';

export interface ContentShortenStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

export function parseContentShortenResponse(response: ProviderResponse): ContentShortenResult {
  return { shortenedContent: response.content.trim() };
}

/** Follows ContentRewriteStrategy's established shape exactly — see that class for the full architecture rationale. */
export class ContentShortenStrategy implements Strategy<ContentShortenResult> {
  readonly name = 'content-shorten';
  readonly version = '1.0.0';

  private readonly pricing?: ContentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContentShortenStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContentShortenResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'content');

    const content = input.content as string;
    const targetLength = typeof input.targetLength === 'number' ? input.targetLength : undefined;

    const promptText = this.prompts.render(CONTENT_SHORTEN_PROMPT_ID, {
      content,
      targetLengthNote:
        targetLength !== undefined ? ` Aim for approximately ${targetLength} words.` : '',
    });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseContentShortenResponse(response);
  }
}
