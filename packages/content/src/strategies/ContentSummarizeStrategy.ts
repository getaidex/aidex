import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTENT_SUMMARIZE_PROMPT_ID } from '../prompts/contentSummarizePrompt.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentSummarizeResult } from '../types/ContentSummarize.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';

export interface ContentSummarizeStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

export function parseContentSummarizeResponse(response: ProviderResponse): ContentSummarizeResult {
  return { summary: response.content.trim() };
}

/** Follows ContentRewriteStrategy's established shape exactly — see that class for the full architecture rationale. */
export class ContentSummarizeStrategy implements Strategy<ContentSummarizeResult> {
  readonly name = 'content-summarize';
  readonly version = '1.0.0';

  private readonly pricing?: ContentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContentSummarizeStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContentSummarizeResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'content');

    const content = input.content as string;
    const maxLength = typeof input.maxLength === 'number' ? input.maxLength : undefined;

    const promptText = this.prompts.render(CONTENT_SUMMARIZE_PROMPT_ID, {
      content,
      maxLength: maxLength !== undefined ? String(maxLength) : 'a reasonable number of',
    });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseContentSummarizeResponse(response);
  }
}
