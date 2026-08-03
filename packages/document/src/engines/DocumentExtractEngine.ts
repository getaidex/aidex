import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DocumentEngineId } from '../identifiers.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import { DOCUMENT_EXTRACT_PROMPT } from '../prompts/documentExtractPrompt.js';
import { DocumentExtractStrategy } from '../strategies/DocumentExtractStrategy.js';
import type { DocumentExtractResult } from '../types/DocumentExtract.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface DocumentExtractEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows DocumentSummarizeEngine's established shape exactly: owns a
 * private PromptRegistry with this engine's one prompt, validates input,
 * then delegates to its Strategy via the same two-argument contract
 * @aidex/core's Aidex.execute() uses — see DocumentSummarizeEngine for the
 * full architecture rationale.
 */
export class DocumentExtractEngine implements Engine<DocumentExtractResult> {
  readonly id = DocumentEngineId.Extract;
  readonly name = 'Document Extract';
  readonly description = 'Extracts structured field data from a document using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: DocumentExtractStrategy;

  constructor(config: DocumentExtractEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DOCUMENT_EXTRACT_PROMPT);
    this.strategy = new DocumentExtractStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DocumentExtractResult> {
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
