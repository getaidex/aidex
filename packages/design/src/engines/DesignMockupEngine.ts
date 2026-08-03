import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DesignEngineId } from '../identifiers.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import { DESIGN_MOCKUP_PROMPT } from '../prompts/designMockupPrompt.js';
import { DesignMockupStrategy } from '../strategies/DesignMockupStrategy.js';
import type { DesignMockupResult } from '../types/DesignMockup.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface DesignMockupEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Phase 3: AI-backed. Follows DesignBrandEngine's established shape exactly — see that class for the full architecture rationale. */
export class DesignMockupEngine implements Engine<DesignMockupResult> {
  readonly id = DesignEngineId.Mockup;
  readonly name = 'Design Mockup';
  readonly description = 'Places a design asset into a realistic mockup scene.';
  readonly version = '1.0.0';

  private readonly strategy: DesignMockupStrategy;

  constructor(config: DesignMockupEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DESIGN_MOCKUP_PROMPT);
    this.strategy = new DesignMockupStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DesignMockupResult> {
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
