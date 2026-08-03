import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { VIDEO_GENERATE_PROMPT_ID } from '../prompts/videoGeneratePrompt.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import type { VideoGenerateResult } from '../types/video.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { mediaAssetFromDescription } from '../engines/internal/mediaAssetFromDescription.js';
import { readEnum, readNumber } from '../engines/internal/readField.js';
import { videoMimeType } from '../engines/internal/mimeTypes.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';

export interface VideoGenerateStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseVideoGenerateResponse(
  strategyName: string,
  response: ProviderResponse,
  mimeType: string
): VideoGenerateResult {
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
export class VideoGenerateStrategy implements Strategy<VideoGenerateResult> {
  readonly name = 'media-video-generate';
  readonly version = '1.0.0';

  private readonly pricing?: MediaEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: VideoGenerateStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<VideoGenerateResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const outputFormat = readEnum(input, 'outputFormat', ['mp4', 'webm', 'mov'] as const);
    const mimeType = videoMimeType(outputFormat);
    const durationSeconds = readNumber(input, 'durationSeconds');
    const durationNote =
      durationSeconds !== undefined ? ` The video should be approximately ${durationSeconds} seconds long.` : '';

    const promptText = this.prompts.render(VIDEO_GENERATE_PROMPT_ID, { brief, durationNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseVideoGenerateResponse(this.name, response, mimeType);
  }
}
