import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DocumentEngineId } from '../identifiers.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import { CONTRACT_REVIEW_PROMPT } from '../prompts/contractReviewPrompt.js';
import { ContractReviewStrategy } from '../strategies/ContractReviewStrategy.js';
import type { ContractReviewResult } from '../types/ContractReview.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface ContractReviewEngineConfig {
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
export class ContractReviewEngine implements Engine<ContractReviewResult> {
  readonly id = DocumentEngineId.ContractReview;
  readonly name = 'Contract Review';
  readonly description =
    'Flags risky clauses in a contract, optionally scoped to specific focus areas, using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ContractReviewStrategy;

  constructor(config: ContractReviewEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CONTRACT_REVIEW_PROMPT);
    this.strategy = new ContractReviewStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ContractReviewResult> {
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
