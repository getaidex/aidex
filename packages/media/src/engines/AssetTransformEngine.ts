import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import { ASSET_TRANSFORM_PROMPT } from '../prompts/assetTransformPrompt.js';
import { AssetTransformStrategy } from '../strategies/AssetTransformStrategy.js';
import type { AssetTransformResult } from '../types/media.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface AssetTransformEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ImageGenerateEngine's established shape exactly — see that class for the full architecture rationale. */
export class AssetTransformEngine implements Engine<AssetTransformResult> {
  readonly id = MediaEngineId.AssetTransform;
  readonly name = 'Asset Transform';
  readonly description = 'Transforms an existing media asset according to a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: AssetTransformStrategy;

  constructor(config: AssetTransformEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(ASSET_TRANSFORM_PROMPT);
    this.strategy = new AssetTransformStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<AssetTransformResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'brief');
    assertHasValidSource(this.id, input);

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
