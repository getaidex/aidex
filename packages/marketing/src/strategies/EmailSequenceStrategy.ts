import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { EMAIL_SEQUENCE_PROMPT_ID } from '../prompts/emailSequencePrompt.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { EmailSequenceResult, EmailSequenceStep } from '../types/email.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readNumber } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asRecordArray, asString } from '../parsing/coerce.js';
import { buildAudienceNote } from './buildAudienceNote.js';

const DEFAULT_STEP_COUNT = 3;
const DAYS_BETWEEN_STEPS = 3;

export interface EmailSequenceStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Its own step so parsing is unit-testable independent of any Provider
 * call. `sendDayOffset` per step stays deterministic (index *
 * DAYS_BETWEEN_STEPS, never AI-derived) — only each step's subject/body
 * come from the provider, one per step, in order.
 */
export function parseEmailSequenceResponse(strategyName: string, response: ProviderResponse): EmailSequenceResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const stepRecords = parsed ? asRecordArray(parsed.steps) : [];
  if (stepRecords.length === 0) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a non-empty "steps" array'
    );
  }

  const steps: EmailSequenceStep[] = stepRecords.map((entry, index) => {
    const subject = asString(entry.subject);
    const body = asString(entry.body);
    if (subject === undefined || body === undefined) {
      throw new UnparsableProviderResponseError(
        strategyName,
        response.content,
        'expected every step to have "subject" and "body" strings'
      );
    }
    return { subject, body, sendDayOffset: index * DAYS_BETWEEN_STEPS };
  });

  return { steps };
}

/** Follows CampaignPlanStrategy's established shape exactly — see that class for the full architecture rationale. */
export class EmailSequenceStrategy implements Strategy<EmailSequenceResult> {
  readonly name = 'marketing-email-sequence';
  readonly version = '1.0.0';

  private readonly pricing?: MarketingEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: EmailSequenceStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<EmailSequenceResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'brief');

    const brief = input.brief as string;
    const stepCount = readNumber(input, 'stepCount') ?? DEFAULT_STEP_COUNT;
    const audienceNote = buildAudienceNote(input.targetAudience as string | undefined);
    const stepCountNote = ` Generate exactly ${stepCount} step(s).`;

    const promptText = this.prompts.render(EMAIL_SEQUENCE_PROMPT_ID, { brief, audienceNote, stepCountNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseEmailSequenceResponse(this.name, response);
  }
}
