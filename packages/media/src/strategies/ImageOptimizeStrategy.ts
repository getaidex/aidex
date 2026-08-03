import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { IMAGE_OPTIMIZE_PROMPT_ID } from '../prompts/imageOptimizePrompt.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import type { ImageOptimizeResult } from '../types/image.types.js';
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

export interface ImageOptimizeStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseImageOptimizeResponse(
  strategyName: string,
  response: ProviderResponse,
  mimeType: string,
  fileSizeKb: number | undefined
): ImageOptimizeResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const description = parsed ? asString(parsed.description) : undefined;
  if (description === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "description" string'
    );
  }

  return {
    ...mediaAssetFromDescription(description, mimeType),
    ...(fileSizeKb !== undefined ? { fileSizeKb } : {}),
  };
}

/**
 * Follows ImageGenerateStrategy's established shape exactly — see that
 * class for the full architecture rationale. No `brief`, unlike most
 * strategies in this package: `image.optimize` is purely parametric.
 * `mimeType` and `fileSizeKb` stay deterministically derived from the
 * request (never AI-invented) — only `assetUrl` comes from the provider.
 */
export class ImageOptimizeStrategy implements Strategy<ImageOptimizeResult> {
  readonly name = 'media-image-optimize';
  readonly version = '1.0.0';

  private readonly pricing?: MediaEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ImageOptimizeStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ImageOptimizeResult> {
    const input = request.input;
    assertHasValidSource(this.name, input);

    const source = input.source as MediaSource;
    const targetFormat = readEnum(input, 'targetFormat', ['png', 'jpg', 'webp', 'svg'] as const);
    const maxFileSizeKb = readNumber(input, 'maxFileSizeKb');
    const mimeType = targetFormat ? imageMimeType(targetFormat) : source.mimeType;
    const constraintsNote =
      (targetFormat ? ` Target format: ${targetFormat}.` : '') +
      (maxFileSizeKb !== undefined ? ` Maximum file size: ${maxFileSizeKb}KB.` : '');

    const promptText = this.prompts.render(IMAGE_OPTIMIZE_PROMPT_ID, {
      sourceNote: buildSourceNote(source),
      constraintsNote,
    });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseImageOptimizeResponse(this.name, response, mimeType, maxFileSizeKb);
  }
}
