import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { MarketingEngineId } from '../identifiers.js';
import { CampaignBriefEngine } from '../engines/CampaignBriefEngine.js';
import { CampaignCalendarEngine } from '../engines/CampaignCalendarEngine.js';
import { CampaignPlanEngine } from '../engines/CampaignPlanEngine.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type {
  CampaignBriefResult,
  CampaignCalendarResult,
  CampaignPlanResult,
} from '../types/campaign.types.js';
import type { MarketingChannel } from '../types/marketing.types.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const CAMPAIGN_WORKFLOW_ID = 'marketing.workflow.campaign';

export interface CampaignWorkflowInput {
  readonly brief: string;
  readonly targetAudience?: string;
  readonly product?: string;
  readonly channels?: readonly MarketingChannel[];
  readonly budget?: number;
  readonly startDate: string;
  readonly durationDays: number;
}

export interface CampaignPackage {
  readonly brief: CampaignBriefResult;
  readonly plan: CampaignPlanResult;
  readonly calendar: CampaignCalendarResult;
}

export interface CampaignWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface CampaignWorkflowState {
  readonly input: CampaignWorkflowInput;
  readonly provider: Provider;
  brief?: CampaignBriefResult;
  plan?: CampaignPlanResult;
  calendar?: CampaignCalendarResult;
}

/** Turns the caller's raw idea into a formal campaign brief document; every step after this reads state.brief. */
class BriefStep implements WorkflowStep<CampaignWorkflowState> {
  readonly name = MarketingEngineId.CampaignBrief;
  private readonly engine: CampaignBriefEngine;

  constructor(config: CampaignWorkflowConfig) {
    this.engine = new CampaignBriefEngine(config);
  }

  async execute(state: CampaignWorkflowState): Promise<void> {
    state.brief = await this.engine.execute(
      buildEngineContext(state.provider, MarketingEngineId.CampaignBrief, {
        brief: state.input.brief,
        targetAudience: state.input.targetAudience,
        product: state.input.product,
      })
    );
  }
}

/** Plans a campaign from BriefStep's formal document, not the caller's raw idea — real engine composition. */
class PlanStep implements WorkflowStep<CampaignWorkflowState> {
  readonly name = MarketingEngineId.CampaignPlan;
  private readonly engine: CampaignPlanEngine;

  constructor(config: CampaignWorkflowConfig) {
    this.engine = new CampaignPlanEngine(config);
  }

  async execute(state: CampaignWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, BriefStep has already
    // completed successfully and state.brief is guaranteed set.
    const brief = state.brief as CampaignBriefResult;

    state.plan = await this.engine.execute(
      buildEngineContext(state.provider, MarketingEngineId.CampaignPlan, {
        brief: brief.document,
        targetAudience: state.input.targetAudience,
        channels: state.input.channels,
        budget: state.input.budget,
        durationDays: state.input.durationDays,
      })
    );
  }
}

/** Builds the calendar around PlanStep's own summary/channels, not the caller's raw input — real engine composition. */
class CalendarStep implements WorkflowStep<CampaignWorkflowState> {
  readonly name = MarketingEngineId.CampaignCalendar;
  private readonly engine: CampaignCalendarEngine;

  constructor(config: CampaignWorkflowConfig) {
    this.engine = new CampaignCalendarEngine(config);
  }

  async execute(state: CampaignWorkflowState): Promise<void> {
    const plan = state.plan as CampaignPlanResult;

    state.calendar = await this.engine.execute(
      buildEngineContext(state.provider, MarketingEngineId.CampaignCalendar, {
        campaignContext: plan.summary,
        startDate: state.input.startDate,
        durationDays: state.input.durationDays,
        channels: plan.channels,
      })
    );
  }
}

/**
 * Composes 3 existing @aidex/marketing engines into one pipeline —
 * marketing.campaign.brief → marketing.campaign.plan →
 * marketing.campaign.calendar — using @aidex/workflow's real
 * Workflow/WorkflowStep/WorkflowExecutor contract. Zero new engines, zero
 * new prompts, zero new providers: every step calls exactly the Engine
 * `@aidex/marketing` already ships. Steps communicate forward by mutating
 * the shared WorkflowContext in place — campaign.brief's formal document
 * becomes campaign.plan's own brief, and campaign.plan's summary/channels
 * become campaign.calendar's context — the same "flow forward" pattern
 * `@aidex/design`'s `BrandKitWorkflow` established.
 */
export class CampaignWorkflow {
  readonly id = CAMPAIGN_WORKFLOW_ID;
  readonly name = 'Campaign';
  readonly description = 'Produces a complete campaign package — brief, plan, and calendar — from a raw idea.';

  private readonly workflow = new Workflow<CampaignWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: CampaignWorkflowConfig = {}) {
    this.workflow.addStep(new BriefStep(config));
    this.workflow.addStep(new PlanStep(config));
    this.workflow.addStep(new CalendarStep(config));
  }

  async run(
    input: CampaignWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<CampaignPackage> {
    const state: CampaignWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      brief: finalState.brief as CampaignBriefResult,
      plan: finalState.plan as CampaignPlanResult,
      calendar: finalState.calendar as CampaignCalendarResult,
    };
  }
}
