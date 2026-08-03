import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DesignEngineId } from '../identifiers.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import { DESIGN_BRAND_PROMPT } from '../prompts/designBrandPrompt.js';
import { DesignBrandStrategy } from '../strategies/DesignBrandStrategy.js';
import type { DesignBrandResult } from '../types/DesignBrand.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface DesignBrandEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Phase 3: AI-backed. Owns a private PromptRegistry (this engine's one
 * prompt, registered once at construction) and a DesignBrandStrategy built
 * from it, then on execute(): validates input, then calls
 * `strategy.execute(request, context)` directly — the exact two-argument
 * contract `@aidex/core`'s own `Aidex.execute()` uses to dispatch a
 * Strategy, so this engine composes with the platform the same way
 * `DocumentSummarizeEngine`/`ContentRewriteEngine` do. The Strategy — not
 * this Engine — owns prompt rendering, the actual Provider call, response
 * parsing, and observability.
 */
export class DesignBrandEngine implements Engine<DesignBrandResult> {
  readonly id = DesignEngineId.Brand;
  readonly name = 'Design Brand';
  readonly description = 'Generates a brand identity — logo, palette, and typography — from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: DesignBrandStrategy;

  constructor(config: DesignBrandEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DESIGN_BRAND_PROMPT);
    this.strategy = new DesignBrandStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DesignBrandResult> {
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
