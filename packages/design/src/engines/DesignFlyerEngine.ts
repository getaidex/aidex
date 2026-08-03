import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DesignEngineId } from '../identifiers.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import { DESIGN_FLYER_PROMPT } from '../prompts/designFlyerPrompt.js';
import { DesignFlyerStrategy } from '../strategies/DesignFlyerStrategy.js';
import type { DesignFlyerResult } from '../types/DesignFlyer.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface DesignFlyerEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Expansion Phase 3: AI-backed. Follows DesignBrandEngine's established shape exactly — see that class for the full architecture rationale. */
export class DesignFlyerEngine implements Engine<DesignFlyerResult> {
  readonly id = DesignEngineId.Flyer;
  readonly name = 'Design Flyer';
  readonly description = 'Generates a flyer design, optionally double-sided, from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: DesignFlyerStrategy;

  constructor(config: DesignFlyerEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DESIGN_FLYER_PROMPT);
    this.strategy = new DesignFlyerStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DesignFlyerResult> {
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
