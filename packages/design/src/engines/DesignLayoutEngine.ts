import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DesignEngineId } from '../identifiers.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import { DESIGN_LAYOUT_PROMPT } from '../prompts/designLayoutPrompt.js';
import { DesignLayoutStrategy } from '../strategies/DesignLayoutStrategy.js';
import type { DesignLayoutResult } from '../types/DesignLayout.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface DesignLayoutEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Expansion Phase 3: AI-backed. Follows DesignBrandEngine's established shape exactly — see that class for the full architecture rationale. */
export class DesignLayoutEngine implements Engine<DesignLayoutResult> {
  readonly id = DesignEngineId.Layout;
  readonly name = 'Design Layout';
  readonly description = 'Arranges content blocks into a designed layout.';
  readonly version = '1.0.0';

  private readonly strategy: DesignLayoutStrategy;

  constructor(config: DesignLayoutEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DESIGN_LAYOUT_PROMPT);
    this.strategy = new DesignLayoutStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DesignLayoutResult> {
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
