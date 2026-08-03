import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTENT_TONE_PROMPT_ID } from '../prompts/contentTonePrompt.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentToneResult } from '../types/ContentTone.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';

export interface ContentToneStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

export function parseContentToneResponse(response: ProviderResponse): ContentToneResult {
  return { content: response.content.trim() };
}

/**
 * Follows ContentRewriteStrategy's established shape exactly — see that
 * class for the full architecture rationale. Requires two fields
 * (`content`, `tone`), mirroring how DocumentTranslateStrategy/
 * ContentTranslateStrategy validate a required field beyond their primary
 * one.
 */
export class ContentToneStrategy implements Strategy<ContentToneResult> {
  readonly name = 'content-tone';
  readonly version = '1.0.0';

  private readonly pricing?: ContentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContentToneStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContentToneResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'content');
    assertHasNonEmptyStringField(this.name, input, 'tone');

    const content = input.content as string;
    const tone = input.tone as string;

    const promptText = this.prompts.render(CONTENT_TONE_PROMPT_ID, { content, tone });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseContentToneResponse(response);
  }
}
