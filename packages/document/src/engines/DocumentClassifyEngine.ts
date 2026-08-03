import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DocumentEngineId } from '../identifiers.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import { DOCUMENT_CLASSIFY_PROMPT } from '../prompts/documentClassifyPrompt.js';
import { DocumentClassifyStrategy } from '../strategies/DocumentClassifyStrategy.js';
import type { DocumentClassifyResult } from '../types/DocumentClassify.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface DocumentClassifyEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows DocumentSummarizeEngine's established shape exactly — see that
 * class for the full architecture rationale. Owns a private
 * PromptRegistry (this engine's one prompt, registered once at
 * construction) and a DocumentClassifyStrategy built from it.
 */
export class DocumentClassifyEngine implements Engine<DocumentClassifyResult> {
  readonly id = DocumentEngineId.Classify;
  readonly name = 'Document Classify';
  readonly description = 'Determines the type or category of a document.';
  readonly version = '1.0.0';

  private readonly strategy: DocumentClassifyStrategy;

  constructor(config: DocumentClassifyEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DOCUMENT_CLASSIFY_PROMPT);
    this.strategy = new DocumentClassifyStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DocumentClassifyResult> {
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
