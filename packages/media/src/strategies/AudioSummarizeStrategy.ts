import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { AUDIO_SUMMARIZE_PROMPT_ID } from '../prompts/audioSummarizePrompt.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import type { AudioSummarizeResult } from '../types/audio.types.js';
import type { MediaSource } from '../types/media.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readNumber } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';
import { buildSourceNote } from './buildSourceNote.js';

const DEFAULT_MAX_LENGTH = 500;

export interface AudioSummarizeStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseAudioSummarizeResponse(
  strategyName: string,
  response: ProviderResponse,
  maxLength: number
): AudioSummarizeResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const summary = parsed ? asString(parsed.summary) : undefined;
  if (summary === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "summary" string'
    );
  }

  return { summary: summary.slice(0, maxLength) };
}

/**
 * Follows ImageGenerateStrategy's established shape exactly — see that
 * class for the full architecture rationale. No `brief`, unlike most
 * strategies in this package: `audio.summarize` is purely parametric. See
 * `audioSummarizePrompt.ts` for this strategy's own known limitation (the
 * provider never actually hears the source audio). `maxLength` is enforced
 * defensively here, not just requested in the prompt — a text Provider has
 * no hard guarantee of respecting a length instruction.
 */
export class AudioSummarizeStrategy implements Strategy<AudioSummarizeResult> {
  readonly name = 'media-audio-summarize';
  readonly version = '1.0.0';

  private readonly pricing?: MediaEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: AudioSummarizeStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<AudioSummarizeResult> {
    const input = request.input;
    assertHasValidSource(this.name, input);

    const source = input.source as MediaSource;
    const maxLength = readNumber(input, 'maxLength') ?? DEFAULT_MAX_LENGTH;
    const lengthNote = ` Keep the summary to at most ${maxLength} characters.`;

    const promptText = this.prompts.render(AUDIO_SUMMARIZE_PROMPT_ID, {
      sourceNote: buildSourceNote(source),
      lengthNote,
    });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseAudioSummarizeResponse(this.name, response, maxLength);
  }
}
