import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DesignEngineId } from '../identifiers.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import { DESIGN_GENERATE_PROMPT } from '../prompts/designGeneratePrompt.js';
import { DesignGenerateStrategy } from '../strategies/DesignGenerateStrategy.js';
import type { DesignGenerateResult } from '../types/DesignGenerate.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface DesignGenerateEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Expansion Phase 3: AI-backed. Follows DesignBrandEngine's established shape exactly — see that class for the full architecture rationale. */
export class DesignGenerateEngine implements Engine<DesignGenerateResult> {
  readonly id = DesignEngineId.Generate;
  readonly name = 'Design Generate';
  readonly description = 'Generates a new design asset from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: DesignGenerateStrategy;

  constructor(config: DesignGenerateEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DESIGN_GENERATE_PROMPT);
    this.strategy = new DesignGenerateStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DesignGenerateResult> {
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
