import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DocumentEngineId } from '../identifiers.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import { DOCUMENT_TRANSFORM_PROMPT } from '../prompts/documentTransformPrompt.js';
import { DocumentTransformStrategy } from '../strategies/DocumentTransformStrategy.js';
import type { DocumentTransformResult } from '../types/DocumentTransform.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface DocumentTransformEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows DocumentSummarizeEngine's established shape exactly — see that
 * class for the full architecture rationale. Only `source` is validated
 * here; `targetFormat` (required by this engine's own Phase 1 contract)
 * is validated by the Strategy, the same division of responsibility
 * DocumentTranslateEngine/DocumentTranslateStrategy already established
 * for `targetLanguage`.
 */
export class DocumentTransformEngine implements Engine<DocumentTransformResult> {
  readonly id = DocumentEngineId.Transform;
  readonly name = 'Document Transform';
  readonly description = "Reformats or restructures a document's content into a target format.";
  readonly version = '1.0.0';

  private readonly strategy: DocumentTransformStrategy;

  constructor(config: DocumentTransformEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DOCUMENT_TRANSFORM_PROMPT);
    this.strategy = new DocumentTransformStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DocumentTransformResult> {
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
