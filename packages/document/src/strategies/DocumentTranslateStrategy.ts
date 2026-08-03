import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { DOCUMENT_TRANSLATE_PROMPT_ID } from '../prompts/documentTranslatePrompt.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import type { DocumentTranslateRequest, DocumentTranslateResult } from '../types/DocumentTranslate.js';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';

export interface DocumentTranslateStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseDocumentTranslateResponse(
  strategyName: string,
  response: ProviderResponse
): DocumentTranslateResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const translatedText = parsed ? asString(parsed.translatedText) : undefined;
  if (translatedText === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "translatedText" string'
    );
  }

  const detectedSourceLanguage = parsed ? asString(parsed.detectedSourceLanguage) : undefined;
  return detectedSourceLanguage !== undefined ? { translatedText, detectedSourceLanguage } : { translatedText };
}

/**
 * Renders the registered `document.translate` prompt, calls whichever
 * Provider context.provider holds, and parses the response into
 * DocumentTranslateResult. Follows DocumentSummarizeStrategy's established
 * shape exactly — see that class for the full architecture rationale.
 *
 * Scope note: text sources only (`mimeType` starting with `text/`) — see
 * @aidex/document's README "Design decisions" for why.
 */
export class DocumentTranslateStrategy implements Strategy<DocumentTranslateResult> {
  readonly name = 'document-translate';
  readonly version = '1.0.0';

  private readonly pricing?: DocumentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: DocumentTranslateStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<DocumentTranslateResult> {
    const input = request.input;
    assertHasValidSource(this.name, input);

    const { source, targetLanguage, sourceLanguage } = input as DocumentTranslateRequest;
    if (!source.mimeType.startsWith('text/')) {
      throw new InvalidDocumentEngineInputError(
        this.name,
        `unsupported mimeType "${source.mimeType}" — this strategy only translates text/* sources`
      );
    }
    if (typeof targetLanguage !== 'string' || targetLanguage.length === 0) {
      throw new InvalidDocumentEngineInputError(this.name, 'targetLanguage must be a non-empty string');
    }

    const promptText = this.prompts.render(DOCUMENT_TRANSLATE_PROMPT_ID, {
      document: source.content,
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

    return parseDocumentTranslateResponse(this.name, response);
  }
}
