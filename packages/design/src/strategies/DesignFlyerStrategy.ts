import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { DESIGN_FLYER_PROMPT_ID } from '../prompts/designFlyerPrompt.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import type { DesignFlyerResult } from '../types/DesignFlyer.js';
import type { DesignOutputFormat } from '../types/DesignOutputFormat.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { assetFromDescription } from '../engines/internal/assetFromDescription.js';
import { readBranding, readNumber, readOutputFormat, readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';
import { buildGuidanceNote } from './buildGuidanceNote.js';

export interface DesignFlyerStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseDesignFlyerResponse(
  strategyName: string,
  response: ProviderResponse,
  format: DesignOutputFormat
): DesignFlyerResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const description = parsed ? asString(parsed.description) : undefined;
  if (description === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "description" string'
    );
  }

  return assetFromDescription(description, format);
}

/**
 * Follows DesignBrandStrategy's established shape exactly. Unlike
 * DesignBusinessCardStrategy's `doubleSided`, `sides` only ever informs
 * the prompt — DesignFlyerResult is a single DesignAssetResult (see that
 * type), not a front/back pair, so there's no separate side to parse out
 * of the response.
 */
export class DesignFlyerStrategy implements Strategy<DesignFlyerResult> {
  readonly name = 'design-flyer';
  readonly version = '1.0.0';

  private readonly pricing?: DesignEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: DesignFlyerStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<DesignFlyerResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const format = readOutputFormat(input) ?? 'pdf';
    const sides = readNumber(input, 'sides');
    const branding = readBranding(input);
    const baseNote = buildGuidanceNote({
      targetAudience: readString(input, 'targetAudience'),
      style: readString(input, 'style'),
    });
    const sidesNote =
      sides === 2 ? ' Design both a front and a back side.' : ' Design a single-sided flyer — front only.';
    const brandingParts: string[] = [];
    if (branding?.colors && branding.colors.length > 0) {
      brandingParts.push(`use these existing brand colors: ${branding.colors.join(', ')}`);
    }
    if (branding?.fonts && branding.fonts.length > 0) {
      brandingParts.push(`reflect these existing brand fonts: ${branding.fonts.join(', ')}`);
    }
    const brandingNote = brandingParts.length > 0 ? ` Please ${brandingParts.join('; ')}.` : '';
    const guidanceNote = baseNote + brandingNote;

    const promptText = this.prompts.render(DESIGN_FLYER_PROMPT_ID, { brief, guidanceNote, sidesNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseDesignFlyerResponse(this.name, response, format);
  }
}
