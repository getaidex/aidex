import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { DESIGN_BRAND_PROMPT_ID } from '../prompts/designBrandPrompt.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import type { DesignBrandResult } from '../types/DesignBrand.js';
import type { DesignOutputFormat } from '../types/DesignOutputFormat.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { assetFromDescription } from '../engines/internal/assetFromDescription.js';
import { readOutputFormat, readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString, asStringArray } from '../parsing/coerce.js';
import { buildGuidanceNote } from './buildGuidanceNote.js';

export interface DesignBrandStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseDesignBrandResponse(
  strategyName: string,
  response: ProviderResponse,
  format: DesignOutputFormat
): DesignBrandResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const logoDescription = parsed ? asString(parsed.logoDescription) : undefined;
  if (logoDescription === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "logoDescription" string'
    );
  }

  const palette = parsed ? asStringArray(parsed.palette) : [];
  const typography = parsed ? asStringArray(parsed.typography) : [];
  const guidelines = parsed ? asString(parsed.guidelines) : undefined;

  return {
    logo: assetFromDescription(logoDescription, format),
    palette,
    typography,
    ...(guidelines !== undefined ? { guidelines } : {}),
  };
}

/**
 * Renders the registered `design.brand` prompt, calls whichever Provider
 * context.provider holds, and parses the response into DesignBrandResult.
 * Follows @aidex/content's ContentRewriteStrategy shape exactly — see that
 * class for the full architecture rationale.
 */
export class DesignBrandStrategy implements Strategy<DesignBrandResult> {
  readonly name = 'design-brand';
  readonly version = '1.0.0';

  private readonly pricing?: DesignEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: DesignBrandStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<DesignBrandResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const format = readOutputFormat(input) ?? 'svg';
    const guidanceNote = buildGuidanceNote({
      targetAudience: readString(input, 'targetAudience'),
      style: readString(input, 'style'),
      industry: readString(input, 'industry'),
    });

    const promptText = this.prompts.render(DESIGN_BRAND_PROMPT_ID, { brief, guidanceNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseDesignBrandResponse(this.name, response, format);
  }
}
