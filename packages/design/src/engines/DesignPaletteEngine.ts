import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DesignEngineId } from '../identifiers.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import { DESIGN_PALETTE_PROMPT } from '../prompts/designPalettePrompt.js';
import { DesignPaletteStrategy } from '../strategies/DesignPaletteStrategy.js';
import type { DesignPaletteResult } from '../types/DesignPalette.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface DesignPaletteEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Phase 3: AI-backed. Follows DesignBrandEngine's established shape exactly — see that class for the full architecture rationale. */
export class DesignPaletteEngine implements Engine<DesignPaletteResult> {
  readonly id = DesignEngineId.Palette;
  readonly name = 'Design Palette';
  readonly description = 'Generates a color palette, optionally complementing an existing brand.';
  readonly version = '1.0.0';

  private readonly strategy: DesignPaletteStrategy;

  constructor(config: DesignPaletteEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DESIGN_PALETTE_PROMPT);
    this.strategy = new DesignPaletteStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DesignPaletteResult> {
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
