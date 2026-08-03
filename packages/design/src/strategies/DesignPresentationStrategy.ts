import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { DESIGN_PRESENTATION_PROMPT_ID } from '../prompts/designPresentationPrompt.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import type { DesignPresentationResult } from '../types/DesignPresentation.js';
import type { DesignOutputFormat } from '../types/DesignOutputFormat.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { assetFromDescription } from '../engines/internal/assetFromDescription.js';
import { readNumber, readOutputFormat, readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asStringArray } from '../parsing/coerce.js';
import { buildGuidanceNote } from './buildGuidanceNote.js';

export interface DesignPresentationStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseDesignPresentationResponse(
  strategyName: string,
  response: ProviderResponse,
  format: DesignOutputFormat
): DesignPresentationResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const slideDescriptions = Array.isArray(parsed?.slides) ? asStringArray(parsed.slides) : undefined;
  if (!slideDescriptions) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "slides" array'
    );
  }

  return { slides: slideDescriptions.map((description) => assetFromDescription(description, format)) };
}

/** Follows DesignBrandStrategy's established shape exactly — see that class for the full architecture rationale. */
export class DesignPresentationStrategy implements Strategy<DesignPresentationResult> {
  readonly name = 'design-presentation';
  readonly version = '1.0.0';

  private readonly pricing?: DesignEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: DesignPresentationStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<DesignPresentationResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const format = readOutputFormat(input) ?? 'pdf';
    const slideCount = readNumber(input, 'slideCount');
    const baseNote = buildGuidanceNote({
      targetAudience: readString(input, 'targetAudience'),
      style: readString(input, 'style'),
    });
    const slideCountNote = slideCount && slideCount > 0 ? ` Generate exactly ${slideCount} slides.` : '';

    const promptText = this.prompts.render(DESIGN_PRESENTATION_PROMPT_ID, {
      brief,
      guidanceNote: baseNote,
      slideCountNote,
    });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseDesignPresentationResponse(this.name, response, format);
  }
}
