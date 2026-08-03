import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { IMAGE_GENERATE_PROMPT_ID } from '../prompts/imageGeneratePrompt.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import type { ImageGenerateResult } from '../types/image.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { mediaAssetFromDescription } from '../engines/internal/mediaAssetFromDescription.js';
import { readEnum } from '../engines/internal/readField.js';
import { imageMimeType } from '../engines/internal/mimeTypes.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';

export interface ImageGenerateStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseImageGenerateResponse(
  strategyName: string,
  response: ProviderResponse,
  mimeType: string
): ImageGenerateResult {
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
 * Renders the registered `media.image.generate` prompt, calls whichever
 * Provider context.provider holds, and parses the response into
 * ImageGenerateResult. Follows @aidex/design's DesignBrandStrategy shape
 * exactly — see that class for the full architecture rationale.
 */
export class ImageGenerateStrategy implements Strategy<ImageGenerateResult> {
  readonly name = 'media-image-generate';
  readonly version = '1.0.0';

  private readonly pricing?: MediaEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ImageGenerateStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ImageGenerateResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const outputFormat = readEnum(input, 'outputFormat', ['png', 'jpg', 'webp', 'svg'] as const);
    const mimeType = imageMimeType(outputFormat);
    const dimensions = asRecord(input.dimensions);
    const dimensionsNote =
      dimensions && typeof dimensions.width === 'number' && typeof dimensions.height === 'number'
        ? ` The image should be ${dimensions.width}x${dimensions.height} pixels.`
        : '';

    const promptText = this.prompts.render(IMAGE_GENERATE_PROMPT_ID, { brief, dimensionsNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseImageGenerateResponse(this.name, response, mimeType);
  }
}
