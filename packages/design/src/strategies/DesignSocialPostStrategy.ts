import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { DESIGN_SOCIAL_POST_PROMPT_ID } from '../prompts/designSocialPostPrompt.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import type { DesignSocialPostResult } from '../types/DesignSocialPost.js';
import type { DesignOutputFormat } from '../types/DesignOutputFormat.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { assetFromDescription } from '../engines/internal/assetFromDescription.js';
import { readBranding, readOutputFormat, readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';
import { buildGuidanceNote } from './buildGuidanceNote.js';

export interface DesignSocialPostStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseDesignSocialPostResponse(
  strategyName: string,
  response: ProviderResponse,
  format: DesignOutputFormat
): DesignSocialPostResult {
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

/** Follows DesignBrandStrategy's established shape exactly — see that class for the full architecture rationale. */
export class DesignSocialPostStrategy implements Strategy<DesignSocialPostResult> {
  readonly name = 'design-social-post';
  readonly version = '1.0.0';

  private readonly pricing?: DesignEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: DesignSocialPostStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<DesignSocialPostResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const format = readOutputFormat(input) ?? 'png';
    const platform = readString(input, 'platform');
    const branding = readBranding(input);
    const baseNote = buildGuidanceNote({
      targetAudience: readString(input, 'targetAudience'),
      style: readString(input, 'style'),
    });
    const platformNote = platform ? ` This post is for: ${platform}.` : '';
    const brandingParts: string[] = [];
    if (branding?.colors && branding.colors.length > 0) {
      brandingParts.push(`use these existing brand colors: ${branding.colors.join(', ')}`);
    }
    if (branding?.fonts && branding.fonts.length > 0) {
      brandingParts.push(`reflect these existing brand fonts: ${branding.fonts.join(', ')}`);
    }
    const brandingNote = brandingParts.length > 0 ? ` Please ${brandingParts.join('; ')}.` : '';
    const guidanceNote = baseNote + brandingNote;

    const promptText = this.prompts.render(DESIGN_SOCIAL_POST_PROMPT_ID, { brief, guidanceNote, platformNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseDesignSocialPostResponse(this.name, response, format);
  }
}
