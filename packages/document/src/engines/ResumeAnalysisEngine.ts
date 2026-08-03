import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DocumentEngineId } from '../identifiers.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import { RESUME_ANALYSIS_PROMPT } from '../prompts/resumeAnalysisPrompt.js';
import { ResumeAnalysisStrategy } from '../strategies/ResumeAnalysisStrategy.js';
import type { ResumeAnalysisResult } from '../types/ResumeAnalysis.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface ResumeAnalysisEngineConfig {
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
export class ResumeAnalysisEngine implements Engine<ResumeAnalysisResult> {
  readonly id = DocumentEngineId.ResumeAnalyze;
  readonly name = 'Resume Analysis';
  readonly description =
    'Extracts candidate skills and experience, optionally scored against a job description, using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ResumeAnalysisStrategy;

  constructor(config: ResumeAnalysisEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(RESUME_ANALYSIS_PROMPT);
    this.strategy = new ResumeAnalysisStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ResumeAnalysisResult> {
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
