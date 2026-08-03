import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { DOCUMENT_CLASSIFY_PROMPT_ID } from '../prompts/documentClassifyPrompt.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import type { DocumentClassifyRequest, DocumentClassifyResult } from '../types/DocumentClassify.js';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asNumber, asRecord, asString } from '../parsing/coerce.js';

export interface DocumentClassifyStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseDocumentClassifyResponse(
  strategyName: string,
  response: ProviderResponse
): DocumentClassifyResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const documentType = parsed ? asString(parsed.documentType) : undefined;
  if (documentType === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "documentType" string'
    );
  }

  const confidence = parsed ? asNumber(parsed.confidence) : undefined;
  return confidence !== undefined ? { documentType, confidence } : { documentType };
}

/**
 * Renders the registered `document.classify` prompt, calls whichever
 * Provider context.provider holds, and parses the response into
 * DocumentClassifyResult. Follows DocumentSummarizeStrategy's established
 * shape exactly — see that class for the full architecture rationale.
 *
 * Scope note: text sources only (`mimeType` starting with `text/`) — see
 * @aidex/document's README "Design decisions" for why.
 */
export class DocumentClassifyStrategy implements Strategy<DocumentClassifyResult> {
  readonly name = 'document-classify';
  readonly version = '1.0.0';

  private readonly pricing?: DocumentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: DocumentClassifyStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<DocumentClassifyResult> {
    const input = request.input;
    assertHasValidSource(this.name, input);

    const { source } = input as DocumentClassifyRequest;
    if (!source.mimeType.startsWith('text/')) {
      throw new InvalidDocumentEngineInputError(
        this.name,
        `unsupported mimeType "${source.mimeType}" — this strategy only classifies text/* sources`
      );
    }

    const promptText = this.prompts.render(DOCUMENT_CLASSIFY_PROMPT_ID, { document: source.content });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseDocumentClassifyResponse(this.name, response);
  }
}
