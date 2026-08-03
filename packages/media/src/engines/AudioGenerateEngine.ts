import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import { AUDIO_GENERATE_PROMPT } from '../prompts/audioGeneratePrompt.js';
import { AudioGenerateStrategy } from '../strategies/AudioGenerateStrategy.js';
import type { AudioGenerateResult } from '../types/audio.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface AudioGenerateEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ImageGenerateEngine's established shape exactly — see that class for the full architecture rationale. */
export class AudioGenerateEngine implements Engine<AudioGenerateResult> {
  readonly id = MediaEngineId.AudioGenerate;
  readonly name = 'Audio Generate';
  readonly description = 'Generates new audio from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: AudioGenerateStrategy;

  constructor(config: AudioGenerateEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(AUDIO_GENERATE_PROMPT);
    this.strategy = new AudioGenerateStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<AudioGenerateResult> {
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
