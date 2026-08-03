import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DesignEngineId } from '../identifiers.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import { DESIGN_BANNER_PROMPT } from '../prompts/designBannerPrompt.js';
import { DesignBannerStrategy } from '../strategies/DesignBannerStrategy.js';
import type { DesignBannerResult } from '../types/DesignBanner.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface DesignBannerEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Expansion Phase 3: AI-backed. Follows DesignBrandEngine's established shape exactly — see that class for the full architecture rationale. */
export class DesignBannerEngine implements Engine<DesignBannerResult> {
  readonly id = DesignEngineId.Banner;
  readonly name = 'Design Banner';
  readonly description = 'Generates a banner design for web or print from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: DesignBannerStrategy;

  constructor(config: DesignBannerEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DESIGN_BANNER_PROMPT);
    this.strategy = new DesignBannerStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DesignBannerResult> {
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
