import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { EMAIL_SUBJECT_PROMPT_ID } from '../prompts/emailSubjectPrompt.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { EmailSubjectResult } from '../types/email.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readNumber } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asStringArray } from '../parsing/coerce.js';
import { buildAudienceNote } from './buildAudienceNote.js';

export interface EmailSubjectStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseEmailSubjectResponse(strategyName: string, response: ProviderResponse): EmailSubjectResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const subjects = parsed ? asStringArray(parsed.subjects) : [];
  if (subjects.length === 0) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a non-empty "subjects" array'
    );
  }

  return { subjects };
}

/** Follows CampaignPlanStrategy's established shape exactly — see that class for the full architecture rationale. */
export class EmailSubjectStrategy implements Strategy<EmailSubjectResult> {
  readonly name = 'marketing-email-subject';
  readonly version = '1.0.0';

  private readonly pricing?: MarketingEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: EmailSubjectStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<EmailSubjectResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const variantCount = readNumber(input, 'variantCount');
    const audienceNote = buildAudienceNote(input.targetAudience as string | undefined);
    const variantsNote = variantCount && variantCount > 0 ? ` Provide exactly ${variantCount} variant(s).` : '';

    const promptText = this.prompts.render(EMAIL_SUBJECT_PROMPT_ID, { brief, audienceNote, variantsNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseEmailSubjectResponse(this.name, response);
  }
}
