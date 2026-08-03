import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { EMAIL_COPY_PROMPT_ID } from '../prompts/emailCopyPrompt.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { EmailCopyResult } from '../types/email.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';
import { buildAudienceNote } from './buildAudienceNote.js';

export interface EmailCopyStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseEmailCopyResponse(strategyName: string, response: ProviderResponse): EmailCopyResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const subject = parsed ? asString(parsed.subject) : undefined;
  const body = parsed ? asString(parsed.body) : undefined;
  if (subject === undefined || body === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with "subject" and "body" strings'
    );
  }

  return { subject, body };
}

/** Follows CampaignPlanStrategy's established shape exactly — see that class for the full architecture rationale. */
export class EmailCopyStrategy implements Strategy<EmailCopyResult> {
  readonly name = 'marketing-email-copy';
  readonly version = '1.0.0';

  private readonly pricing?: MarketingEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: EmailCopyStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<EmailCopyResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const callToAction = readString(input, 'callToAction');
    const audienceNote = buildAudienceNote(input.targetAudience as string | undefined);
    const ctaNote = callToAction ? ` End with this call to action: "${callToAction}".` : '';

    const promptText = this.prompts.render(EMAIL_COPY_PROMPT_ID, { brief, audienceNote, ctaNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseEmailCopyResponse(this.name, response);
  }
}
