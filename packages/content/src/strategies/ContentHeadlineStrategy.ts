import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTENT_HEADLINE_PROMPT_ID } from '../prompts/contentHeadlinePrompt.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentHeadlineResult } from '../types/ContentHeadline.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseRequiredStringArrayField } from '../parsing/parseRequiredStringArrayField.js';

export interface ContentHeadlineStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseContentHeadlineResponse(
  strategyName: string,
  response: ProviderResponse
): ContentHeadlineResult {
  return { headlines: parseRequiredStringArrayField(strategyName, response.content, 'headlines') };
}

/** Follows ContentRewriteStrategy's established shape exactly — see that class for the full architecture rationale. */
export class ContentHeadlineStrategy implements Strategy<ContentHeadlineResult> {
  readonly name = 'content-headline';
  readonly version = '1.0.0';

  private readonly pricing?: ContentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContentHeadlineStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContentHeadlineResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'topic');

    const topic = input.topic as string;
    const count = typeof input.count === 'number' ? input.count : undefined;

    const promptText = this.prompts.render(CONTENT_HEADLINE_PROMPT_ID, {
      topic,
      count: count !== undefined ? String(count) : 'a few',
    });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseContentHeadlineResponse(this.name, response);
  }
}
