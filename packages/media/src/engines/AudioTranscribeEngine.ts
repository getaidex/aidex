import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import { AUDIO_TRANSCRIBE_PROMPT } from '../prompts/audioTranscribePrompt.js';
import { AudioTranscribeStrategy } from '../strategies/AudioTranscribeStrategy.js';
import type { AudioTranscribeResult } from '../types/audio.types.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface AudioTranscribeEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows ImageGenerateEngine's established shape exactly — see that class
 * for the full architecture rationale. No `brief` requirement, unlike most
 * engines in this package: `audio.transcribe` is purely parametric. See
 * `AudioTranscribeStrategy`/`audioTranscribePrompt.ts` for this engine's
 * own known limitation.
 */
export class AudioTranscribeEngine implements Engine<AudioTranscribeResult> {
  readonly id = MediaEngineId.AudioTranscribe;
  readonly name = 'Audio Transcribe';
  readonly description = 'Transcribes speech from an existing audio asset to text.';
  readonly version = '1.0.0';

  private readonly strategy: AudioTranscribeStrategy;

  constructor(config: AudioTranscribeEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(AUDIO_TRANSCRIBE_PROMPT);
    this.strategy = new AudioTranscribeStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<AudioTranscribeResult> {
    const input = context.request?.input;
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
