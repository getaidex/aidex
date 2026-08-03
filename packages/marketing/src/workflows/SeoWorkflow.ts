import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { MarketingEngineId } from '../identifiers.js';
import { SeoAuditEngine } from '../engines/SeoAuditEngine.js';
import { SeoKeywordsEngine } from '../engines/SeoKeywordsEngine.js';
import { SeoMetaEngine } from '../engines/SeoMetaEngine.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { SeoAuditResult, SeoKeywordsResult, SeoMetaResult } from '../types/seo.types.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const SEO_WORKFLOW_ID = 'marketing.workflow.seo';

export interface SeoWorkflowInput {
  readonly brief: string;
  readonly targetAudience?: string;
  readonly market?: string;
  readonly content: string;
  readonly url: string;
}

export interface SeoPackage {
  readonly keywords: SeoKeywordsResult;
  readonly meta: SeoMetaResult;
  readonly audit: SeoAuditResult;
}

export interface SeoWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface SeoWorkflowState {
  readonly input: SeoWorkflowInput;
  readonly provider: Provider;
  keywords?: SeoKeywordsResult;
  meta?: SeoMetaResult;
  audit?: SeoAuditResult;
}

class KeywordsStep implements WorkflowStep<SeoWorkflowState> {
  readonly name = MarketingEngineId.SeoKeywords;
  private readonly engine: SeoKeywordsEngine;

  constructor(config: SeoWorkflowConfig) {
    this.engine = new SeoKeywordsEngine(config);
  }

  async execute(state: SeoWorkflowState): Promise<void> {
    state.keywords = await this.engine.execute(
      buildEngineContext(state.provider, MarketingEngineId.SeoKeywords, {
        brief: state.input.brief,
        targetAudience: state.input.targetAudience,
        market: state.input.market,
      })
    );
  }
}

/** Targets KeywordsStep's own top keyword — real engine composition, not an independent call. */
class MetaStep implements WorkflowStep<SeoWorkflowState> {
  readonly name = MarketingEngineId.SeoMeta;
  private readonly engine: SeoMetaEngine;

  constructor(config: SeoWorkflowConfig) {
    this.engine = new SeoMetaEngine(config);
  }

  async execute(state: SeoWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, KeywordsStep has already
    // completed successfully and state.keywords is guaranteed set.
    const keywords = state.keywords as SeoKeywordsResult;
    const targetKeyword = keywords.keywords[0]?.keyword;

    state.meta = await this.engine.execute(
      buildEngineContext(state.provider, MarketingEngineId.SeoMeta, {
        content: state.input.content,
        targetKeyword,
      })
    );
  }
}

/** Audits the page content enriched with MetaStep's own title/description — real engine composition, not an independent call. */
class AuditStep implements WorkflowStep<SeoWorkflowState> {
  readonly name = MarketingEngineId.SeoAudit;
  private readonly engine: SeoAuditEngine;

  constructor(config: SeoWorkflowConfig) {
    this.engine = new SeoAuditEngine(config);
  }

  async execute(state: SeoWorkflowState): Promise<void> {
    const meta = state.meta as SeoMetaResult;
    const content = `${state.input.content}\n\nMeta title: ${meta.title}\nMeta description: ${meta.description}`;

    state.audit = await this.engine.execute(
      buildEngineContext(state.provider, MarketingEngineId.SeoAudit, {
        url: state.input.url,
        content,
      })
    );
  }
}

/**
 * Composes 3 existing @aidex/marketing engines into one pipeline —
 * marketing.seo.keywords → marketing.seo.meta → marketing.seo.audit —
 * using @aidex/workflow's real Workflow/WorkflowStep/WorkflowExecutor
 * contract. Zero new engines, zero new prompts, zero new providers.
 * Follows `CampaignWorkflow`'s established shape exactly — see that
 * class for the full architecture rationale. All 3 steps genuinely
 * chain: seo.keywords' top result becomes seo.meta's `targetKeyword`, and
 * seo.meta's own title/description are folded into the content
 * seo.audit reviews.
 */
export class SeoWorkflow {
  readonly id = SEO_WORKFLOW_ID;
  readonly name = 'SEO';
  readonly description = 'Produces an SEO package — keywords, meta tags, and an audit — from a topic and page content.';

  private readonly workflow = new Workflow<SeoWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: SeoWorkflowConfig = {}) {
    this.workflow.addStep(new KeywordsStep(config));
    this.workflow.addStep(new MetaStep(config));
    this.workflow.addStep(new AuditStep(config));
  }

  async run(
    input: SeoWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<SeoPackage> {
    const state: SeoWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      keywords: finalState.keywords as SeoKeywordsResult,
      meta: finalState.meta as SeoMetaResult,
      audit: finalState.audit as SeoAuditResult,
    };
  }
}
