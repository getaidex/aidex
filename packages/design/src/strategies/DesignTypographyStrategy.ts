import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { DESIGN_TYPOGRAPHY_PROMPT_ID } from '../prompts/designTypographyPrompt.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import type { DesignFontPairing } from '../types/DesignFontPairing.js';
import type { DesignTypographyResult } from '../types/DesignTypography.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readBranding, readNumber, readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';
import { buildGuidanceNote } from './buildGuidanceNote.js';

export interface DesignTypographyStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

function parsePairing(value: unknown): DesignFontPairing | undefined {
  const record = asRecord(value);
  const heading = record ? asString(record.heading) : undefined;
  const body = record ? asString(record.body) : undefined;
  if (heading === undefined || body === undefined) {
    return undefined;
  }
  const notes = record ? asString(record.notes) : undefined;
  return { heading, body, ...(notes !== undefined ? { notes } : {}) };
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseDesignTypographyResponse(
  strategyName: string,
  response: ProviderResponse
): DesignTypographyResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const pairingsRaw = Array.isArray(parsed?.pairings) ? parsed.pairings : undefined;
  if (!pairingsRaw) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "pairings" array'
    );
  }

  const pairings = pairingsRaw.map(parsePairing).filter((p): p is DesignFontPairing => p !== undefined);
  return { pairings };
}

/** Pure structured data, like DesignPaletteStrategy — no rendering-pipeline gap to work around. */
export class DesignTypographyStrategy implements Strategy<DesignTypographyResult> {
  readonly name = 'design-typography';
  readonly version = '1.0.0';

  private readonly pricing?: DesignEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: DesignTypographyStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<DesignTypographyResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const pairingCount = readNumber(input, 'pairingCount');
    const branding = readBranding(input);
    const baseNote = buildGuidanceNote({
      targetAudience: readString(input, 'targetAudience'),
      style: readString(input, 'style'),
    });
    const countNote = pairingCount && pairingCount > 0 ? ` Generate exactly ${pairingCount} pairings.` : '';
    const brandingNote =
      branding?.fonts && branding.fonts.length > 0
        ? ` Complement these existing brand fonts: ${branding.fonts.join(', ')}.`
        : '';

    const promptText = this.prompts.render(DESIGN_TYPOGRAPHY_PROMPT_ID, {
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

    return parseDesignTypographyResponse(this.name, response);
  }
}
