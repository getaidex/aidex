import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTENT_TRANSLATE_PROMPT_ID } from '../prompts/contentTranslatePrompt.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentTranslateResult } from '../types/ContentTranslate.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';

export interface ContentTranslateStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseContentTranslateResponse(
  strategyName: string,
  response: ProviderResponse
): ContentTranslateResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const translatedContent = parsed ? asString(parsed.translatedContent) : undefined;
  if (translatedContent === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "translatedContent" string'
    );
  }

  const detectedSourceLanguage = parsed ? asString(parsed.detectedSourceLanguage) : undefined;
  return detectedSourceLanguage !== undefined
    ? { translatedContent, detectedSourceLanguage }
    : { translatedContent };
}

/**
 * Follows ContentRewriteStrategy's established shape exactly, and mirrors
 * @aidex/document's DocumentTranslateStrategy field-for-field — see those
 * classes for the full architecture rationale.
 */
export class ContentTranslateStrategy implements Strategy<ContentTranslateResult> {
  readonly name = 'content-translate';
  readonly version = '1.0.0';

  private readonly pricing?: ContentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContentTranslateStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContentTranslateResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'content');
    assertHasNonEmptyStringField(this.name, input, 'targetLanguage');

    const content = input.content as string;
    const targetLanguage = input.targetLanguage as string;
    const sourceLanguage = typeof input.sourceLanguage === 'string' ? input.sourceLanguage : undefined;

    const promptText = this.prompts.render(CONTENT_TRANSLATE_PROMPT_ID, {
      content,
      targetLanguage,
      sourceLanguageNote:
        sourceLanguage !== undefined
          ? `The source language is ${sourceLanguage}.`
          : 'Detect the source language automatically.',
    });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseContentTranslateResponse(this.name, response);
  }
}
