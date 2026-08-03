import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import { EMAIL_SUBJECT_PROMPT } from '../prompts/emailSubjectPrompt.js';
import { EmailSubjectStrategy } from '../strategies/EmailSubjectStrategy.js';
import type { EmailSubjectResult } from '../types/email.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface EmailSubjectEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows CampaignPlanEngine's established shape exactly — see that class for the full architecture rationale. */
export class EmailSubjectEngine implements Engine<EmailSubjectResult> {
  readonly id = MarketingEngineId.EmailSubject;
  readonly name = 'Email Subject';
  readonly description = 'Generates email subject line variants from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: EmailSubjectStrategy;

  constructor(config: EmailSubjectEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(EMAIL_SUBJECT_PROMPT);
    this.strategy = new EmailSubjectStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<EmailSubjectResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'brief');

    return this.strategy.execute(
      {
        strategy: this.strategy.name,
        input,
        metadata: context.request?.metadata,
        options: context.request?.options,
      },
      context
    );
  }
}
