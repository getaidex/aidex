import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DesignEngineId } from '../identifiers.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import { DESIGN_TYPOGRAPHY_PROMPT } from '../prompts/designTypographyPrompt.js';
import { DesignTypographyStrategy } from '../strategies/DesignTypographyStrategy.js';
import type { DesignTypographyResult } from '../types/DesignTypography.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface DesignTypographyEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Phase 3: AI-backed. Follows DesignBrandEngine's established shape exactly — see that class for the full architecture rationale. */
export class DesignTypographyEngine implements Engine<DesignTypographyResult> {
  readonly id = DesignEngineId.Typography;
  readonly name = 'Design Typography';
  readonly description = 'Generates font pairings, optionally complementing an existing brand.';
  readonly version = '1.0.0';

  private readonly strategy: DesignTypographyStrategy;

  constructor(config: DesignTypographyEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DESIGN_TYPOGRAPHY_PROMPT);
    this.strategy = new DesignTypographyStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DesignTypographyResult> {
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
