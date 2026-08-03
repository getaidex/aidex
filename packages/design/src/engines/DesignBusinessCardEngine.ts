import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DesignEngineId } from '../identifiers.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import { DESIGN_BUSINESS_CARD_PROMPT } from '../prompts/designBusinessCardPrompt.js';
import { DesignBusinessCardStrategy } from '../strategies/DesignBusinessCardStrategy.js';
import type { DesignBusinessCardResult } from '../types/DesignBusinessCard.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface DesignBusinessCardEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Phase 3: AI-backed. Follows DesignBrandEngine's established shape exactly — see that class for the full architecture rationale. */
export class DesignBusinessCardEngine implements Engine<DesignBusinessCardResult> {
  readonly id = DesignEngineId.BusinessCard;
  readonly name = 'Design Business Card';
  readonly description = 'Generates a business card design, optionally double-sided, from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: DesignBusinessCardStrategy;

  constructor(config: DesignBusinessCardEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DESIGN_BUSINESS_CARD_PROMPT);
    this.strategy = new DesignBusinessCardStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DesignBusinessCardResult> {
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
