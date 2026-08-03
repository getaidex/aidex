import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { MarketingEngineId } from '../identifiers.js';
import { AnalyticsInsightsEngine } from '../engines/AnalyticsInsightsEngine.js';
import { AnalyticsSummaryEngine } from '../engines/AnalyticsSummaryEngine.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { AnalyticsInsightsResult, AnalyticsSummaryResult, MetricPoint } from '../types/analytics.types.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const ANALYTICS_WORKFLOW_ID = 'marketing.workflow.analytics';

export interface AnalyticsWorkflowInput {
  readonly metrics: readonly MetricPoint[];
  readonly periodLabel?: string;
  readonly goal?: string;
}

export interface AnalyticsReport {
  readonly summary: AnalyticsSummaryResult;
  readonly insights: AnalyticsInsightsResult;
}

export interface AnalyticsWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface AnalyticsWorkflowState {
  readonly input: AnalyticsWorkflowInput;
  readonly provider: Provider;
  summary?: AnalyticsSummaryResult;
  insights?: AnalyticsInsightsResult;
}

class SummaryStep implements WorkflowStep<AnalyticsWorkflowState> {
  readonly name = MarketingEngineId.AnalyticsSummary;
  private readonly engine: AnalyticsSummaryEngine;

  constructor(config: AnalyticsWorkflowConfig) {
    this.engine = new AnalyticsSummaryEngine(config);
  }

  async execute(state: AnalyticsWorkflowState): Promise<void> {
    state.summary = await this.engine.execute(
      buildEngineContext(state.provider, MarketingEngineId.AnalyticsSummary, {
        metrics: state.input.metrics,
        periodLabel: state.input.periodLabel,
      })
    );
  }
}

class InsightsStep implements WorkflowStep<AnalyticsWorkflowState> {
  readonly name = MarketingEngineId.AnalyticsInsights;
  private readonly engine: AnalyticsInsightsEngine;

  constructor(config: AnalyticsWorkflowConfig) {
    this.engine = new AnalyticsInsightsEngine(config);
  }

  async execute(state: AnalyticsWorkflowState): Promise<void> {
    state.insights = await this.engine.execute(
      buildEngineContext(state.provider, MarketingEngineId.AnalyticsInsights, {
        metrics: state.input.metrics,
        goal: state.input.goal,
      })
    );
  }
}

/**
 * Composes 2 existing @aidex/marketing engines into one pipeline —
 * marketing.analytics.summary → marketing.analytics.insights — using
 * @aidex/workflow's real Workflow/WorkflowStep/WorkflowExecutor contract.
 * Zero new engines, zero new prompts, zero new providers.
 *
 * Unlike `CampaignWorkflow`/`SocialWorkflow`/`EmailWorkflow`/`SeoWorkflow`,
 * these two steps are NOT data-dependent, the same honest constraint
 * `@aidex/media`'s `AudioProcessingWorkflow` documented for its own
 * `audio.transcribe`/`audio.summarize` pair: `analytics.summary`'s Result
 * is narrative text, but `analytics.insights`' Phase 1 contract
 * (`AnalyticsInsightsRequest{metrics, goal?}`) takes structured
 * `MetricPoint[]`, not free text — there is no field for the summary to
 * flow into. So both steps read `state.input.metrics` independently
 * rather than piping SummaryStep's output into InsightsStep. Reshaping
 * `AnalyticsInsightsRequest` to accept a summary string would violate
 * Phase 4's "do not duplicate engine logic" constraint from the other
 * direction — it also means not reshaping an engine's contract to fit a
 * workflow's convenience. This workflow's value is bundling summary +
 * insights into one call with shared lifecycle/cancellation/error
 * handling, not fabricating a pipeline the engines don't actually
 * support yet.
 */
export class AnalyticsWorkflow {
  readonly id = ANALYTICS_WORKFLOW_ID;
  readonly name = 'Analytics';
  readonly description = 'Produces an analytics report — summary and insights — from a set of marketing metrics.';

  private readonly workflow = new Workflow<AnalyticsWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: AnalyticsWorkflowConfig = {}) {
    this.workflow.addStep(new SummaryStep(config));
    this.workflow.addStep(new InsightsStep(config));
  }

  async run(
    input: AnalyticsWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<AnalyticsReport> {
    const state: AnalyticsWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      summary: finalState.summary as AnalyticsSummaryResult,
      insights: finalState.insights as AnalyticsInsightsResult,
    };
  }
}
