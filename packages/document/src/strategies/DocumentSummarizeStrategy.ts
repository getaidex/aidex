import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { DOCUMENT_SUMMARIZE_PROMPT_ID } from '../prompts/documentSummarizePrompt.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import type { DocumentSummarizeRequest, DocumentSummarizeResult } from '../types/DocumentSummarize.js';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';

export interface DocumentSummarizeStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so a future strategy that needs real JSON parsing has a named place to put it, and so parsing is unit-testable on its own. */
export function parseDocumentSummarizeResponse(response: ProviderResponse): DocumentSummarizeResult {
  return { summary: response.content.trim() };
}

/**
 * The reference AI-backed Strategy for @aidex/document: renders the
 * registered `document.summarize` prompt, calls whichever Provider
 * context.provider holds (via the shared callProviderWithObservability,
 * which also records provider/duration/tokens/cost via an optional
 * ObservabilityBus — mirroring @aidex/providers' GeminiProvider one layer
 * up, generically for any Provider), then parses the response into
 * DocumentSummarizeResult. Never imports a vendor SDK; never branches on
 * context.provider.name.
 *
 * Scope note: this version only summarizes text sources (`mimeType`
 * starting with `text/`). Binary sources (PDF, images) need OCR/extraction
 * first — that's DocumentOcrEngine's job, not this strategy's, and isn't
 * wired yet.
 */
export class DocumentSummarizeStrategy implements Strategy<DocumentSummarizeResult> {
  readonly name = 'document-summarize';
  readonly version = '1.0.0';

  private readonly pricing?: DocumentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: DocumentSummarizeStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<DocumentSummarizeResult> {
    const input = request.input;
    assertHasValidSource(this.name, input);

    const { source, maxLength } = input as DocumentSummarizeRequest;
    if (!source.mimeType.startsWith('text/')) {
      throw new InvalidDocumentEngineInputError(
        this.name,
        `unsupported mimeType "${source.mimeType}" — this strategy only summarizes text/* sources`
      );
    }

    const promptText = this.prompts.render(DOCUMENT_SUMMARIZE_PROMPT_ID, {
      document: source.content,
      maxLength: maxLength !== undefined ? String(maxLength) : 'a reasonable number of',
    });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseDocumentSummarizeResponse(response);
  }
}
