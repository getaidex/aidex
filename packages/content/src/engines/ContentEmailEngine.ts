import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { ContentEngineId } from '../identifiers.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import { CONTENT_EMAIL_PROMPT } from '../prompts/contentEmailPrompt.js';
import { ContentEmailStrategy } from '../strategies/ContentEmailStrategy.js';
import type { ContentEmailResult } from '../types/ContentEmail.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface ContentEmailEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ContentRewriteEngine's established shape exactly — see that class for the full architecture rationale. */
export class ContentEmailEngine implements Engine<ContentEmailResult> {
  readonly id = ContentEngineId.Email;
  readonly name = 'Content Email';
  readonly description = 'Generates an email for a given purpose using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ContentEmailStrategy;

  constructor(config: ContentEmailEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CONTENT_EMAIL_PROMPT);
    this.strategy = new ContentEmailStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ContentEmailResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'purpose');

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
