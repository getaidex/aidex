import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MediaEngineId } from '../identifiers.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import { AUDIO_SUMMARIZE_PROMPT } from '../prompts/audioSummarizePrompt.js';
import { AudioSummarizeStrategy } from '../strategies/AudioSummarizeStrategy.js';
import type { AudioSummarizeResult } from '../types/audio.types.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface AudioSummarizeEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows ImageGenerateEngine's established shape exactly — see that class
 * for the full architecture rationale. No `brief` requirement, unlike most
 * engines in this package: `audio.summarize` is purely parametric. See
 * `AudioSummarizeStrategy`/`audioSummarizePrompt.ts` for this engine's own
 * known limitation.
 */
export class AudioSummarizeEngine implements Engine<AudioSummarizeResult> {
  readonly id = MediaEngineId.AudioSummarize;
  readonly name = 'Audio Summarize';
  readonly description = 'Summarizes the content of an existing audio asset.';
  readonly version = '1.0.0';

  private readonly strategy: AudioSummarizeStrategy;

  constructor(config: AudioSummarizeEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(AUDIO_SUMMARIZE_PROMPT);
    this.strategy = new AudioSummarizeStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<AudioSummarizeResult> {
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
