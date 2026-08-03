import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { AUDIO_GENERATE_PROMPT_ID } from '../prompts/audioGeneratePrompt.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import type { AudioGenerateResult } from '../types/audio.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { mediaAssetFromDescription } from '../engines/internal/mediaAssetFromDescription.js';
import { readEnum, readNumber } from '../engines/internal/readField.js';
import { audioMimeType } from '../engines/internal/mimeTypes.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';

export interface AudioGenerateStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseAudioGenerateResponse(
  strategyName: string,
  response: ProviderResponse,
  mimeType: string
): AudioGenerateResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const description = parsed ? asString(parsed.description) : undefined;
  if (description === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "description" string'
    );
  }

  return mediaAssetFromDescription(description, mimeType);
}

/** Follows ImageGenerateStrategy's established shape exactly — see that class for the full architecture rationale. */
export class AudioGenerateStrategy implements Strategy<AudioGenerateResult> {
  readonly name = 'media-audio-generate';
  readonly version = '1.0.0';

  private readonly pricing?: MediaEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: AudioGenerateStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<AudioGenerateResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const outputFormat = readEnum(input, 'outputFormat', ['mp3', 'wav', 'ogg'] as const);
    const mimeType = audioMimeType(outputFormat);
    const durationSeconds = readNumber(input, 'durationSeconds');
    const durationNote =
      durationSeconds !== undefined ? ` The audio should be approximately ${durationSeconds} seconds long.` : '';

    const promptText = this.prompts.render(AUDIO_GENERATE_PROMPT_ID, { brief, durationNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseAudioGenerateResponse(this.name, response, mimeType);
  }
}
