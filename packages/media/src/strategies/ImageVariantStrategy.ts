import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { IMAGE_VARIANT_PROMPT_ID } from '../prompts/imageVariantPrompt.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import type { ImageVariantResult } from '../types/image.types.js';
import type { MediaSource } from '../types/media.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { mediaAssetFromDescription } from '../engines/internal/mediaAssetFromDescription.js';
import { readEnum, readNumber } from '../engines/internal/readField.js';
import { imageMimeType } from '../engines/internal/mimeTypes.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asStringArray } from '../parsing/coerce.js';
import { buildSourceNote } from './buildSourceNote.js';

export interface ImageVariantStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseImageVariantResponse(
  strategyName: string,
  response: ProviderResponse,
  mimeType: string
): ImageVariantResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const variantDescriptions = parsed ? asStringArray(parsed.variantDescriptions) : [];
  if (variantDescriptions.length === 0) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a non-empty "variantDescriptions" array'
    );
  }

  return {
    variants: variantDescriptions.map((description) => mediaAssetFromDescription(description, mimeType)),
  };
}

/** Follows ImageGenerateStrategy's established shape exactly — see that class for the full architecture rationale. */
export class ImageVariantStrategy implements Strategy<ImageVariantResult> {
  readonly name = 'media-image-variant';
  readonly version = '1.0.0';

  private readonly pricing?: MediaEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ImageVariantStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ImageVariantResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');
    assertHasValidSource(this.name, input);

    const brief = input.brief as string;
    const source = input.source as MediaSource;
    const outputFormat = readEnum(input, 'outputFormat', ['png', 'jpg', 'webp', 'svg'] as const);
    const mimeType = imageMimeType(outputFormat);
    const variantCount = readNumber(input, 'variantCount');
    const variantsNote =
      variantCount && variantCount > 0 ? ` Provide exactly ${variantCount} variant description(s).` : '';

    const promptText = this.prompts.render(IMAGE_VARIANT_PROMPT_ID, {
      brief,
      sourceNote: buildSourceNote(source),
      variantsNote,
    });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseImageVariantResponse(this.name, response, mimeType);
  }
}
