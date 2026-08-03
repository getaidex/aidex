import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import { SEO_META_PROMPT } from '../prompts/seoMetaPrompt.js';
import { SeoMetaStrategy } from '../strategies/SeoMetaStrategy.js';
import type { SeoMetaResult } from '../types/seo.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface SeoMetaEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows CampaignPlanEngine's established shape exactly — see that class
 * for the full architecture rationale. No `brief` requirement, unlike
 * most engines in this package: `seo.meta` derives meta tags from
 * existing page content, not a fresh creative brief.
 */
export class SeoMetaEngine implements Engine<SeoMetaResult> {
  readonly id = MarketingEngineId.SeoMeta;
  readonly name = 'SEO Meta';
  readonly description = 'Generates an SEO title and meta description from existing page content.';
  readonly version = '1.0.0';

  private readonly strategy: SeoMetaStrategy;

  constructor(config: SeoMetaEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(SEO_META_PROMPT);
    this.strategy = new SeoMetaStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<SeoMetaResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'content');

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
