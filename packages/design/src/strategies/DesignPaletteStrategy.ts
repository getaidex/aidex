import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { DESIGN_PALETTE_PROMPT_ID } from '../prompts/designPalettePrompt.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import type { DesignColor } from '../types/DesignColor.js';
import type { DesignPaletteResult } from '../types/DesignPalette.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readBranding, readNumber, readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';
import { buildGuidanceNote } from './buildGuidanceNote.js';

export interface DesignPaletteStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

function parseColor(value: unknown): DesignColor | undefined {
  const record = asRecord(value);
  const name = record ? asString(record.name) : undefined;
  const hex = record ? asString(record.hex) : undefined;
  if (name === undefined || hex === undefined) {
    return undefined;
  }
  const role = record ? asString(record.role) : undefined;
  return { name, hex, ...(role !== undefined ? { role } : {}) };
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseDesignPaletteResponse(strategyName: string, response: ProviderResponse): DesignPaletteResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const colorsRaw = Array.isArray(parsed?.colors) ? parsed.colors : undefined;
  if (!colorsRaw) {
    throw new UnparsableProviderResponseError(strategyName, response.content, 'expected an object with a "colors" array');
  }

  const colors = colorsRaw.map(parseColor).filter((color): color is DesignColor => color !== undefined);
  return { colors };
}

/**
 * Unlike DesignBrandStrategy/DesignLogoStrategy, this Result is pure
 * structured data (color names and hex codes) — no DesignAssetResult, no
 * `assetFromDescription`. A color palette is exactly the kind of output a
 * text-only Provider can produce completely and honestly, with no
 * rendering-pipeline gap to work around.
 */
export class DesignPaletteStrategy implements Strategy<DesignPaletteResult> {
  readonly name = 'design-palette';
  readonly version = '1.0.0';

  private readonly pricing?: DesignEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: DesignPaletteStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<DesignPaletteResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const colorCount = readNumber(input, 'colorCount');
    const branding = readBranding(input);
    const baseNote = buildGuidanceNote({
      targetAudience: readString(input, 'targetAudience'),
      style: readString(input, 'style'),
    });
    const countNote = colorCount && colorCount > 0 ? ` Generate exactly ${colorCount} colors.` : '';
    const brandingNote =
      branding?.colors && branding.colors.length > 0
        ? ` Complement these existing brand colors: ${branding.colors.join(', ')}.`
        : '';

    const promptText = this.prompts.render(DESIGN_PALETTE_PROMPT_ID, {
      brief,
      guidanceNote: baseNote + countNote + brandingNote,
    });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseDesignPaletteResponse(this.name, response);
  }
}
