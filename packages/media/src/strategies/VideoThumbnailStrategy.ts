import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { VIDEO_THUMBNAIL_PROMPT_ID } from '../prompts/videoThumbnailPrompt.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import type { VideoThumbnailResult } from '../types/video.types.js';
import type { MediaSource } from '../types/media.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { mediaAssetFromDescription } from '../engines/internal/mediaAssetFromDescription.js';
import { readEnum, readNumber } from '../engines/internal/readField.js';
import { imageMimeType } from '../engines/internal/mimeTypes.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';
import { buildSourceNote } from './buildSourceNote.js';

export interface VideoThumbnailStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseVideoThumbnailResponse(
  strategyName: string,
  response: ProviderResponse,
  mimeType: string
): VideoThumbnailResult {
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

/**
 * Follows ImageGenerateStrategy's established shape exactly — see that
 * class for the full architecture rationale. No `brief`, unlike most
 * strategies in this package: `video.thumbnail` is purely parametric.
 */
export class VideoThumbnailStrategy implements Strategy<VideoThumbnailResult> {
  readonly name = 'media-video-thumbnail';
  readonly version = '1.0.0';

  private readonly pricing?: MediaEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: VideoThumbnailStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<VideoThumbnailResult> {
    const input = request.input;
    assertHasValidSource(this.name, input);

    const source = input.source as MediaSource;
    const outputFormat = readEnum(input, 'outputFormat', ['png', 'jpg'] as const);
    const mimeType = outputFormat ? imageMimeType(outputFormat) : 'image/jpeg';
    const timestampSeconds = readNumber(input, 'timestampSeconds');
    const timestampNote =
      timestampSeconds !== undefined ? ` Extract the frame at approximately ${timestampSeconds} seconds.` : '';

    const promptText = this.prompts.render(VIDEO_THUMBNAIL_PROMPT_ID, {
      sourceNote: buildSourceNote(source),
      timestampNote,
    });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseVideoThumbnailResponse(this.name, response, mimeType);
  }
}
