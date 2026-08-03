import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DesignEngineId } from '../identifiers.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import { DESIGN_PRESENTATION_PROMPT } from '../prompts/designPresentationPrompt.js';
import { DesignPresentationStrategy } from '../strategies/DesignPresentationStrategy.js';
import type { DesignPresentationResult } from '../types/DesignPresentation.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface DesignPresentationEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Phase 3: AI-backed. Follows DesignBrandEngine's established shape exactly — see that class for the full architecture rationale. */
export class DesignPresentationEngine implements Engine<DesignPresentationResult> {
  readonly id = DesignEngineId.Presentation;
  readonly name = 'Design Presentation';
  readonly description = 'Generates a set of presentation slide designs from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: DesignPresentationStrategy;

  constructor(config: DesignPresentationEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DESIGN_PRESENTATION_PROMPT);
    this.strategy = new DesignPresentationStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DesignPresentationResult> {
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
