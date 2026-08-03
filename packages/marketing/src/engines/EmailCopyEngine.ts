import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import { EMAIL_COPY_PROMPT } from '../prompts/emailCopyPrompt.js';
import { EmailCopyStrategy } from '../strategies/EmailCopyStrategy.js';
import type { EmailCopyResult } from '../types/email.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface EmailCopyEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows CampaignPlanEngine's established shape exactly — see that class for the full architecture rationale. */
export class EmailCopyEngine implements Engine<EmailCopyResult> {
  readonly id = MarketingEngineId.EmailCopy;
  readonly name = 'Email Copy';
  readonly description = 'Generates a subject line and body copy for a marketing email from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: EmailCopyStrategy;

  constructor(config: EmailCopyEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(EMAIL_COPY_PROMPT);
    this.strategy = new EmailCopyStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<EmailCopyResult> {
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
