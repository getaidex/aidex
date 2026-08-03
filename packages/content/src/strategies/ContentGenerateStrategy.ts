import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTENT_GENERATE_PROMPT_ID } from '../prompts/contentGeneratePrompt.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentGenerateResult } from '../types/ContentGenerate.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { buildGuidanceNote } from './buildGuidanceNote.js';
import { asNumber, asStringArray } from '../parsing/coerce.js';

export interface ContentGenerateStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

export function parseContentGenerateResponse(response: ProviderResponse): ContentGenerateResult {
  return { content: response.content.trim() };
}

/** Follows ContentRewriteStrategy's established shape exactly — see that class for the full architecture rationale. */
export class ContentGenerateStrategy implements Strategy<ContentGenerateResult> {
  readonly name = 'content-generate';
  readonly version = '1.0.0';

  private readonly pricing?: ContentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContentGenerateStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContentGenerateResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'topic');

    const topic = input.topic as string;
    const guidance = buildGuidanceNote({
      keywords: asStringArray(input.keywords),
      tone: typeof input.tone === 'string' ? input.tone : undefined,
      length: asNumber(input.length),
    });

    const promptText = this.prompts.render(CONTENT_GENERATE_PROMPT_ID, { topic, guidance });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseContentGenerateResponse(response);
  }
}
