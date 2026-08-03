import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { AUDIO_TRANSCRIBE_PROMPT_ID } from '../prompts/audioTranscribePrompt.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import type { AudioTranscribeResult } from '../types/audio.types.js';
import type { MediaSource } from '../types/media.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';
import { buildSourceNote } from './buildSourceNote.js';

export interface AudioTranscribeStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseAudioTranscribeResponse(
  strategyName: string,
  response: ProviderResponse
): AudioTranscribeResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const text = parsed ? asString(parsed.text) : undefined;
  if (text === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "text" string'
    );
  }

  const detectedLanguage = parsed ? asString(parsed.detectedLanguage) : undefined;
  return { text, ...(detectedLanguage !== undefined ? { detectedLanguage } : {}) };
}

/**
 * Follows ImageGenerateStrategy's established shape exactly — see that
 * class for the full architecture rationale. No `brief`, unlike most
 * strategies in this package: `audio.transcribe` is purely parametric.
 * See `audioTranscribePrompt.ts` for this strategy's own known limitation
 * (the provider never actually hears the source audio).
 */
export class AudioTranscribeStrategy implements Strategy<AudioTranscribeResult> {
  readonly name = 'media-audio-transcribe';
  readonly version = '1.0.0';

  private readonly pricing?: MediaEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: AudioTranscribeStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<AudioTranscribeResult> {
    const input = request.input;
    assertHasValidSource(this.name, input);

    const source = input.source as MediaSource;
    const language = readString(input, 'language');
    const languageNote = language ? ` The expected language is ${language}.` : '';

    const promptText = this.prompts.render(AUDIO_TRANSCRIBE_PROMPT_ID, {
      sourceNote: buildSourceNote(source),
      languageNote,
    });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseAudioTranscribeResponse(this.name, response);
  }
}
