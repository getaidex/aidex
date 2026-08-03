import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DesignEngineId } from '../identifiers.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import { DESIGN_POSTER_PROMPT } from '../prompts/designPosterPrompt.js';
import { DesignPosterStrategy } from '../strategies/DesignPosterStrategy.js';
import type { DesignPosterResult } from '../types/DesignPoster.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface DesignPosterEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Expansion Phase 3: AI-backed. Follows DesignBrandEngine's established shape exactly — see that class for the full architecture rationale. */
export class DesignPosterEngine implements Engine<DesignPosterResult> {
  readonly id = DesignEngineId.Poster;
  readonly name = 'Design Poster';
  readonly description = 'Generates a poster design from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: DesignPosterStrategy;

  constructor(config: DesignPosterEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DESIGN_POSTER_PROMPT);
    this.strategy = new DesignPosterStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DesignPosterResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'brief');

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
