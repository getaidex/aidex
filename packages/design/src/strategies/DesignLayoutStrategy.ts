import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { DESIGN_LAYOUT_PROMPT_ID } from '../prompts/designLayoutPrompt.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import type { DesignLayoutResult } from '../types/DesignLayout.js';
import type { DesignOutputFormat } from '../types/DesignOutputFormat.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { assetFromDescription } from '../engines/internal/assetFromDescription.js';
import { readOutputFormat, readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString, asStringArray } from '../parsing/coerce.js';
import { buildGuidanceNote } from './buildGuidanceNote.js';

export interface DesignLayoutStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseDesignLayoutResponse(
  strategyName: string,
  response: ProviderResponse,
  format: DesignOutputFormat
): DesignLayoutResult {
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
 * Follows DesignBrandStrategy's established shape exactly, adapted for
 * the one request in this pack with no `branding` field — a layout
 * arranges given content blocks, it doesn't respect an existing brand.
 */
export class DesignLayoutStrategy implements Strategy<DesignLayoutResult> {
  readonly name = 'design-layout';
  readonly version = '1.0.0';

  private readonly pricing?: DesignEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: DesignLayoutStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<DesignLayoutResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const format = readOutputFormat(input) ?? 'png';
    const guidanceNote = buildGuidanceNote({
      targetAudience: readString(input, 'targetAudience'),
      style: readString(input, 'style'),
    });
    const contentBlocks = asStringArray(input.contentBlocks);
    const contentBlocksNote =
      contentBlocks.length > 0 ? ` Arrange exactly these content blocks: ${contentBlocks.join(', ')}.` : '';

    const promptText = this.prompts.render(DESIGN_LAYOUT_PROMPT_ID, { brief, guidanceNote, contentBlocksNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseDesignLayoutResponse(this.name, response, format);
  }
}
