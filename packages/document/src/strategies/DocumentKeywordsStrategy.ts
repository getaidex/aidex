import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { DOCUMENT_KEYWORDS_PROMPT_ID } from '../prompts/documentKeywordsPrompt.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import type { DocumentKeywordsRequest, DocumentKeywordsResult } from '../types/DocumentKeywords.js';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asStringArray } from '../parsing/coerce.js';

export interface DocumentKeywordsStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseDocumentKeywordsResponse(
  strategyName: string,
  response: ProviderResponse
): DocumentKeywordsResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  if (!parsed || !Array.isArray(parsed.keywords)) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "keywords" array'
    );
  }

  return { keywords: asStringArray(parsed.keywords) };
}

/**
 * Renders the registered `document.keywords` prompt, calls whichever
 * Provider context.provider holds, and parses the response into
 * DocumentKeywordsResult. Follows DocumentSummarizeStrategy's established
 * shape exactly — see that class for the full architecture rationale.
 *
 * Scope note: text sources only (`mimeType` starting with `text/`) — see
 * @aidex/document's README "Design decisions" for why.
 */
export class DocumentKeywordsStrategy implements Strategy<DocumentKeywordsResult> {
  readonly name = 'document-keywords';
  readonly version = '1.0.0';

  private readonly pricing?: DocumentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: DocumentKeywordsStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<DocumentKeywordsResult> {
    const input = request.input;
    assertHasValidSource(this.name, input);

    const { source } = input as DocumentKeywordsRequest;
    if (!source.mimeType.startsWith('text/')) {
      throw new InvalidDocumentEngineInputError(
        this.name,
        `unsupported mimeType "${source.mimeType}" — this strategy only extracts keywords from text/* sources`
      );
    }

    const promptText = this.prompts.render(DOCUMENT_KEYWORDS_PROMPT_ID, { document: source.content });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseDocumentKeywordsResponse(this.name, response);
  }
}
