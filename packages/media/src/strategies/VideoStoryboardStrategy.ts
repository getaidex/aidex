import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { VIDEO_STORYBOARD_PROMPT_ID } from '../prompts/videoStoryboardPrompt.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import type { StoryboardScene, VideoStoryboardResult } from '../types/video.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readNumber } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asNumber, asRecord, asString } from '../parsing/coerce.js';

export interface VideoStoryboardStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

function parseScene(value: unknown): StoryboardScene | undefined {
  const record = asRecord(value);
  const description = record ? asString(record.description) : undefined;
  if (description === undefined) {
    return undefined;
  }
  const durationSeconds = record ? asNumber(record.durationSeconds) : undefined;
  return { description, ...(durationSeconds !== undefined ? { durationSeconds } : {}) };
}

/**
 * Its own step so parsing is unit-testable independent of any Provider
 * call. `scenes` is genuine textual content, not a `MediaAssetResult` —
 * no `mediaAssetFromDescription` wrapping needed here.
 */
export function parseVideoStoryboardResponse(
  strategyName: string,
  response: ProviderResponse
): VideoStoryboardResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const rawScenes = Array.isArray(parsed?.scenes) ? parsed.scenes : undefined;
  const scenes = rawScenes
    ?.map(parseScene)
    .filter((scene): scene is StoryboardScene => scene !== undefined);

  if (!scenes || scenes.length === 0) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a non-empty "scenes" array of { description, durationSeconds? }'
    );
  }

  return { scenes };
}

/** Follows ImageGenerateStrategy's established shape exactly — see that class for the full architecture rationale. */
export class VideoStoryboardStrategy implements Strategy<VideoStoryboardResult> {
  readonly name = 'media-video-storyboard';
  readonly version = '1.0.0';

  private readonly pricing?: MediaEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: VideoStoryboardStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<VideoStoryboardResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const sceneCount = readNumber(input, 'sceneCount');
    const sceneCountNote = sceneCount && sceneCount > 0 ? ` Generate exactly ${sceneCount} scenes.` : '';

    const promptText = this.prompts.render(VIDEO_STORYBOARD_PROMPT_ID, { brief, sceneCountNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseVideoStoryboardResponse(this.name, response);
  }
}
