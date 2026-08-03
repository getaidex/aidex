import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DocumentEngineId } from '../identifiers.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import { DOCUMENT_SUMMARIZE_PROMPT } from '../prompts/documentSummarizePrompt.js';
import { DocumentSummarizeStrategy } from '../strategies/DocumentSummarizeStrategy.js';
import type { DocumentSummarizeResult } from '../types/DocumentSummarize.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface DocumentSummarizeEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * The reference AI-powered Document Engine — the template every remaining
 * engine in this pack should follow. Owns a private PromptRegistry (this
 * engine's one prompt, registered once at construction) and a
 * DocumentSummarizeStrategy built from it, then on execute():
 *
 *   1. validates context.request?.input (fail fast, before touching a Strategy)
 *   2. calls strategy.execute(request, context) — the exact two-argument
 *      contract @aidex/core's own Aidex.execute() uses to dispatch a Strategy,
 *      so this engine composes with the platform the same way any external
 *      application does, without constructing a redundant nested Aidex
 *      kernel just to reach a Strategy it already holds a direct reference
 *      to (context already carries the one thing a kernel would supply
 *      here — the configured Provider).
 *
 * The Strategy — not this Engine — owns prompt rendering, the actual
 * Provider call, response parsing, and observability, mirroring exactly
 * where @aidex/providers' GeminiProvider records observability: at the
 * layer that holds the raw ProviderResponse.
 */
export class DocumentSummarizeEngine implements Engine<DocumentSummarizeResult> {
  readonly id = DocumentEngineId.Summarize;
  readonly name = 'Document Summarize';
  readonly description = 'Produces a condensed summary of a document using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: DocumentSummarizeStrategy;

  constructor(config: DocumentSummarizeEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DOCUMENT_SUMMARIZE_PROMPT);
    this.strategy = new DocumentSummarizeStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DocumentSummarizeResult> {
    const input = context.request?.input;
    assertHasValidSource(this.id, input);

    return this.strategy.execute(
      {
        strategy: this.strategy.name,
        input,
        metadata: context.request?.metadata,
        options: context.request?.options,
      },
      context
    );
  }
}
