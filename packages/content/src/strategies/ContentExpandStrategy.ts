import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTENT_EXPAND_PROMPT_ID } from '../prompts/contentExpandPrompt.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentExpandResult } from '../types/ContentExpand.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';

export interface ContentExpandStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

export function parseContentExpandResponse(response: ProviderResponse): ContentExpandResult {
  return { expandedContent: response.content.trim() };
}

/** Follows ContentRewriteStrategy's established shape exactly — see that class for the full architecture rationale. */
export class ContentExpandStrategy implements Strategy<ContentExpandResult> {
  readonly name = 'content-expand';
  readonly version = '1.0.0';

  private readonly pricing?: ContentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContentExpandStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContentExpandResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'content');

    const content = input.content as string;
    const targetLength = typeof input.targetLength === 'number' ? input.targetLength : undefined;

    const promptText = this.prompts.render(CONTENT_EXPAND_PROMPT_ID, {
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

    return parseContentExpandResponse(response);
  }
}
