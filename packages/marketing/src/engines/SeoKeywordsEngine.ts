import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import { SEO_KEYWORDS_PROMPT } from '../prompts/seoKeywordsPrompt.js';
import { SeoKeywordsStrategy } from '../strategies/SeoKeywordsStrategy.js';
import type { SeoKeywordsResult } from '../types/seo.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface SeoKeywordsEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Follows CampaignPlanEngine's established shape exactly — see that class for the full architecture rationale. */
export class SeoKeywordsEngine implements Engine<SeoKeywordsResult> {
  readonly id = MarketingEngineId.SeoKeywords;
  readonly name = 'SEO Keywords';
  readonly description = 'Generates a keyword list with estimated volume and difficulty from a topic brief.';
  readonly version = '1.0.0';

  private readonly strategy: SeoKeywordsStrategy;

  constructor(config: SeoKeywordsEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(SEO_KEYWORDS_PROMPT);
    this.strategy = new SeoKeywordsStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<SeoKeywordsResult> {
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
