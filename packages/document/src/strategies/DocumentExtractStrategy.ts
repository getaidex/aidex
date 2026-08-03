import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { DOCUMENT_EXTRACT_PROMPT_ID } from '../prompts/documentExtractPrompt.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import type { DocumentExtractRequest, DocumentExtractResult } from '../types/DocumentExtract.js';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asNumber, asRecord, asString } from '../parsing/coerce.js';

export interface DocumentExtractStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseDocumentExtractResponse(
  strategyName: string,
  response: ProviderResponse
): DocumentExtractResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const fieldsRaw = parsed ? asRecord(parsed.fields) : undefined;
  if (!fieldsRaw) {
    throw new UnparsableProviderResponseError(strategyName, response.content, 'expected an object with a "fields" object');
  }

  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(fieldsRaw)) {
    const str = asString(value);
    if (str !== undefined) {
      fields[key] = str;
    }
  }

  const confidenceRaw = parsed ? asRecord(parsed.confidence) : undefined;
  if (!confidenceRaw) {
    return { fields };
  }

  const confidence: Record<string, number> = {};
  for (const [key, value] of Object.entries(confidenceRaw)) {
    const num = asNumber(value);
    if (num !== undefined) {
      confidence[key] = num;
    }
  }

  return { fields, confidence };
}

/**
 * Renders the registered `document.extract` prompt, calls whichever
 * Provider context.provider holds, and parses the response into
 * DocumentExtractResult. Follows DocumentSummarizeStrategy's established
 * shape exactly — see that class for the full architecture rationale.
 *
 * Scope note: text sources only (`mimeType` starting with `text/`) — see
 * @aidex/document's README "Design decisions" for why.
 */
export class DocumentExtractStrategy implements Strategy<DocumentExtractResult> {
  readonly name = 'document-extract';
  readonly version = '1.0.0';

  private readonly pricing?: DocumentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: DocumentExtractStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<DocumentExtractResult> {
    const input = request.input;
    assertHasValidSource(this.name, input);

    const { source, fields } = input as DocumentExtractRequest;
    if (!source.mimeType.startsWith('text/')) {
      throw new InvalidDocumentEngineInputError(
        this.name,
        `unsupported mimeType "${source.mimeType}" — this strategy only extracts from text/* sources`
      );
    }

    const promptText = this.prompts.render(DOCUMENT_EXTRACT_PROMPT_ID, {
      document: source.content,
      fields: fields && fields.length > 0 ? fields.join(', ') : 'all relevant fields found in the document',
    });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseDocumentExtractResponse(this.name, response);
  }
}
