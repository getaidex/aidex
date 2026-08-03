import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { ContentEngineId } from '../identifiers.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import { CONTENT_TONE_PROMPT } from '../prompts/contentTonePrompt.js';
import { ContentToneStrategy } from '../strategies/ContentToneStrategy.js';
import type { ContentToneResult } from '../types/ContentTone.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface ContentToneEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: ContentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows ContentRewriteEngine's established shape exactly — see that class for the full architecture rationale. */
export class ContentToneEngine implements Engine<ContentToneResult> {
  readonly id = ContentEngineId.Tone;
  readonly name = 'Content Tone';
  readonly description = 'Adjusts the tone of existing content using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: ContentToneStrategy;

  constructor(config: ContentToneEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(CONTENT_TONE_PROMPT);
    this.strategy = new ContentToneStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<ContentToneResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'content');
    assertHasNonEmptyStringField(this.id, input, 'tone');

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
