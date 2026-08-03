import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { ASSET_CONVERT_PROMPT_ID } from '../prompts/assetConvertPrompt.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import type { AssetConvertResult } from '../types/media.types.js';
import type { MediaSource } from '../types/media.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { mediaAssetFromDescription } from '../engines/internal/mediaAssetFromDescription.js';
import { genericMimeType } from '../engines/internal/mimeTypes.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';
import { buildSourceNote } from './buildSourceNote.js';

export interface AssetConvertStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MediaEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseAssetConvertResponse(
  strategyName: string,
  response: ProviderResponse,
  mimeType: string
): AssetConvertResult {
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
 * strategies in this package: `asset.convert` is purely parametric.
 */
export class AssetConvertStrategy implements Strategy<AssetConvertResult> {
  readonly name = 'media-asset-convert';
  readonly version = '1.0.0';

  private readonly pricing?: MediaEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: AssetConvertStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<AssetConvertResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'targetFormat');
    assertHasValidSource(this.name, input);

    const source = input.source as MediaSource;
    const targetFormat = input.targetFormat as string;
    const mimeType = genericMimeType(targetFormat);

    const promptText = this.prompts.render(ASSET_CONVERT_PROMPT_ID, {
      sourceNote: buildSourceNote(source),
      targetFormatNote: ` Convert to the "${targetFormat}" format.`,
    });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseAssetConvertResponse(this.name, response, mimeType);
  }
}
