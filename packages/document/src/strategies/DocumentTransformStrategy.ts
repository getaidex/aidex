import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { DOCUMENT_TRANSFORM_PROMPT_ID } from '../prompts/documentTransformPrompt.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import type { DocumentTransformRequest, DocumentTransformResult } from '../types/DocumentTransform.js';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';

export interface DocumentTransformStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Known target formats get a real MIME type; anything else falls back to a generic `application/<format>`. */
const KNOWN_MIME_TYPES: Readonly<Record<string, string>> = {
  markdown: 'text/markdown',
  'plain-text': 'text/plain',
  html: 'text/html',
  json: 'application/json',
};

function resolveMimeType(targetFormat: string): string {
  return KNOWN_MIME_TYPES[targetFormat] ?? `application/${targetFormat}`;
}

/** Its own step so parsing is unit-testable independent of any Provider call. `mimeType` is computed deterministically from `targetFormat`, never AI-derived — only `content` comes from the provider. */
export function parseDocumentTransformResponse(
  strategyName: string,
  response: ProviderResponse,
  targetFormat: string
): DocumentTransformResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const content = parsed ? asString(parsed.content) : undefined;
  if (content === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "content" string'
    );
  }

  return { content, mimeType: resolveMimeType(targetFormat) };
}

/**
 * Renders the registered `document.transform` prompt, calls whichever
 * Provider context.provider holds, and parses the response into
 * DocumentTransformResult. Follows DocumentSummarizeStrategy's established
 * shape exactly — see that class for the full architecture rationale.
 * `targetFormat` is required by this engine's own Phase 1 contract but
 * isn't covered by `assertHasValidSource` (which only proves `source`), so
 * it's validated inline — the identical pattern
 * DocumentTranslateStrategy already uses for its own required
 * `targetLanguage` field.
 *
 * Scope note: text sources only (`mimeType` starting with `text/`) — see
 * @aidex/document's README "Design decisions" for why.
 */
export class DocumentTransformStrategy implements Strategy<DocumentTransformResult> {
  readonly name = 'document-transform';
  readonly version = '1.0.0';

  private readonly pricing?: DocumentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: DocumentTransformStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<DocumentTransformResult> {
    const input = request.input;
    assertHasValidSource(this.name, input);

    const { source, targetFormat } = input as DocumentTransformRequest;
    if (!source.mimeType.startsWith('text/')) {
      throw new InvalidDocumentEngineInputError(
        this.name,
        `unsupported mimeType "${source.mimeType}" — this strategy only transforms text/* sources`
      );
    }
    if (typeof targetFormat !== 'string' || targetFormat.length === 0) {
      throw new InvalidDocumentEngineInputError(this.name, 'targetFormat must be a non-empty string');
    }

    const promptText = this.prompts.render(DOCUMENT_TRANSFORM_PROMPT_ID, {
      document: source.content,
      targetFormat,
    });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseDocumentTransformResponse(this.name, response, targetFormat);
  }
}
