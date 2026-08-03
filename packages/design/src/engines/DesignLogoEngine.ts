import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DesignEngineId } from '../identifiers.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import { DESIGN_LOGO_PROMPT } from '../prompts/designLogoPrompt.js';
import { DesignLogoStrategy } from '../strategies/DesignLogoStrategy.js';
import type { DesignLogoResult } from '../types/DesignLogo.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface DesignLogoEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Phase 3: AI-backed. Follows DesignBrandEngine's established shape exactly — see that class for the full architecture rationale. */
export class DesignLogoEngine implements Engine<DesignLogoResult> {
  readonly id = DesignEngineId.Logo;
  readonly name = 'Design Logo';
  readonly description = 'Generates a logo, with optional alternate variants, from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: DesignLogoStrategy;

  constructor(config: DesignLogoEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DESIGN_LOGO_PROMPT);
    this.strategy = new DesignLogoStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DesignLogoResult> {
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
