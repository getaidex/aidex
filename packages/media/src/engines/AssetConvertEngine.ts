import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import { ASSET_CONVERT_PROMPT } from '../prompts/assetConvertPrompt.js';
import { AssetConvertStrategy } from '../strategies/AssetConvertStrategy.js';
import type { AssetConvertResult } from '../types/media.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface AssetConvertEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows ImageGenerateEngine's established shape exactly — see that class
 * for the full architecture rationale. No `brief` requirement, unlike most
 * engines in this package: `asset.convert` is purely parametric.
 */
export class AssetConvertEngine implements Engine<AssetConvertResult> {
  readonly id = MediaEngineId.AssetConvert;
  readonly name = 'Asset Convert';
  readonly description = 'Converts an existing media asset to a target format.';
  readonly version = '1.0.0';

  private readonly strategy: AssetConvertStrategy;

  constructor(config: AssetConvertEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(ASSET_CONVERT_PROMPT);
    this.strategy = new AssetConvertStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<AssetConvertResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'targetFormat');
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
