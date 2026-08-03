import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import { EMAIL_SEQUENCE_PROMPT } from '../prompts/emailSequencePrompt.js';
import { EmailSequenceStrategy } from '../strategies/EmailSequenceStrategy.js';
import type { EmailSequenceResult } from '../types/email.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface EmailSequenceEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows CampaignPlanEngine's established shape exactly — see that class for the full architecture rationale. */
export class EmailSequenceEngine implements Engine<EmailSequenceResult> {
  readonly id = MarketingEngineId.EmailSequence;
  readonly name = 'Email Sequence';
  readonly description = 'Generates a multi-step email drip sequence from a creative brief.';
  readonly version = '1.0.0';

  private readonly strategy: EmailSequenceStrategy;

  constructor(config: EmailSequenceEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(EMAIL_SEQUENCE_PROMPT);
    this.strategy = new EmailSequenceStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<EmailSequenceResult> {
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
