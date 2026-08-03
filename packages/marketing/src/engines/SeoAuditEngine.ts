import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { MarketingEngineId } from '../identifiers.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import { SEO_AUDIT_PROMPT } from '../prompts/seoAuditPrompt.js';
import { SeoAuditStrategy } from '../strategies/SeoAuditStrategy.js';
import type { SeoAuditResult } from '../types/seo.types.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface SeoAuditEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows CampaignPlanEngine's established shape exactly — see that class
 * for the full architecture rationale. No `brief` requirement, unlike
 * most engines in this package: `seo.audit` inspects an existing
 * page/URL, not a fresh creative brief.
 */
export class SeoAuditEngine implements Engine<SeoAuditResult> {
  readonly id = MarketingEngineId.SeoAudit;
  readonly name = 'SEO Audit';
  readonly description = 'Audits an existing page or URL for SEO issues and produces a scored report.';
  readonly version = '1.0.0';

  private readonly strategy: SeoAuditStrategy;

  constructor(config: SeoAuditEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(SEO_AUDIT_PROMPT);
    this.strategy = new SeoAuditStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<SeoAuditResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'url');

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
