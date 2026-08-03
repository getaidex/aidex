import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DocumentEngineId } from '../identifiers.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import { DOCUMENT_REVIEW_PROMPT } from '../prompts/documentReviewPrompt.js';
import { DocumentReviewStrategy } from '../strategies/DocumentReviewStrategy.js';
import type { DocumentReviewResult } from '../types/DocumentReview.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface DocumentReviewEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows DocumentSummarizeEngine's established shape exactly — see that
 * class for the full architecture rationale. Domain-neutral sibling of
 * ContractReviewEngine.
 */
export class DocumentReviewEngine implements Engine<DocumentReviewResult> {
  readonly id = DocumentEngineId.Review;
  readonly name = 'Document Review';
  readonly description = 'Reviews a document for issues, optionally scoped to specific focus areas.';
  readonly version = '1.0.0';

  private readonly strategy: DocumentReviewStrategy;

  constructor(config: DocumentReviewEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DOCUMENT_REVIEW_PROMPT);
    this.strategy = new DocumentReviewStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DocumentReviewResult> {
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
