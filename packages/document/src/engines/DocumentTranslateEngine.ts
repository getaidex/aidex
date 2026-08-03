import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DocumentEngineId } from '../identifiers.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import { DOCUMENT_TRANSLATE_PROMPT } from '../prompts/documentTranslatePrompt.js';
import { DocumentTranslateStrategy } from '../strategies/DocumentTranslateStrategy.js';
import type { DocumentTranslateResult } from '../types/DocumentTranslate.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface DocumentTranslateEngineConfig {
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
export class DocumentTranslateEngine implements Engine<DocumentTranslateResult> {
  readonly id = DocumentEngineId.Translate;
  readonly name = 'Document Translate';
  readonly description = 'Translates a document into a target language using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: DocumentTranslateStrategy;

  constructor(config: DocumentTranslateEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DOCUMENT_TRANSLATE_PROMPT);
    this.strategy = new DocumentTranslateStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DocumentTranslateResult> {
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
