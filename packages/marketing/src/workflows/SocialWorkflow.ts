import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { MarketingEngineId } from '../identifiers.js';
import { SocialCaptionEngine } from '../engines/SocialCaptionEngine.js';
import { SocialHashtagsEngine } from '../engines/SocialHashtagsEngine.js';
import { SocialScheduleEngine } from '../engines/SocialScheduleEngine.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type {
  SocialCaptionResult,
  SocialHashtagsResult,
  SocialPlatform,
  SocialScheduleResult,
} from '../types/social.types.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const SOCIAL_WORKFLOW_ID = 'marketing.workflow.social';

export interface SocialWorkflowInput {
  readonly brief: string;
  readonly targetAudience?: string;
  readonly platform?: SocialPlatform;
  readonly hashtagCount?: number;
  readonly startDate: string;
}

export interface SocialPublishingPackage {
  readonly caption: SocialCaptionResult;
  readonly hashtags: SocialHashtagsResult;
  readonly schedule: SocialScheduleResult;
}

export interface SocialWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface SocialWorkflowState {
  readonly input: SocialWorkflowInput;
  readonly provider: Provider;
  caption?: SocialCaptionResult;
  hashtags?: SocialHashtagsResult;
  schedule?: SocialScheduleResult;
}

class CaptionStep implements WorkflowStep<SocialWorkflowState> {
  readonly name = MarketingEngineId.SocialCaption;
  private readonly engine: SocialCaptionEngine;

  constructor(config: SocialWorkflowConfig) {
    this.engine = new SocialCaptionEngine(config);
  }

  async execute(state: SocialWorkflowState): Promise<void> {
    state.caption = await this.engine.execute(
      buildEngineContext(state.provider, MarketingEngineId.SocialCaption, {
        brief: state.input.brief,
        targetAudience: state.input.targetAudience,
        platform: state.input.platform,
      })
    );
  }
}

class HashtagsStep implements WorkflowStep<SocialWorkflowState> {
  readonly name = MarketingEngineId.SocialHashtags;
  private readonly engine: SocialHashtagsEngine;

  constructor(config: SocialWorkflowConfig) {
    this.engine = new SocialHashtagsEngine(config);
  }

  async execute(state: SocialWorkflowState): Promise<void> {
    state.hashtags = await this.engine.execute(
      buildEngineContext(state.provider, MarketingEngineId.SocialHashtags, {
        brief: state.input.brief,
        targetAudience: state.input.targetAudience,
        platform: state.input.platform,
        count: state.input.hashtagCount,
      })
    );
  }
}

/** Combines CaptionStep's and HashtagsStep's own output into the post content — real engine composition, not 3 independent calls. */
class ScheduleStep implements WorkflowStep<SocialWorkflowState> {
  readonly name = MarketingEngineId.SocialSchedule;
  private readonly engine: SocialScheduleEngine;

  constructor(config: SocialWorkflowConfig) {
    this.engine = new SocialScheduleEngine(config);
  }

  async execute(state: SocialWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, CaptionStep/HashtagsStep
    // have already completed successfully and state.caption/
    // state.hashtags are guaranteed set.
    const caption = state.caption as SocialCaptionResult;
    const hashtags = state.hashtags as SocialHashtagsResult;
    const platform = state.input.platform ?? 'instagram';
    const content = [caption.caption, ...hashtags.hashtags].join(' ');

    state.schedule = await this.engine.execute(
      buildEngineContext(state.provider, MarketingEngineId.SocialSchedule, {
        posts: [{ content, platform }],
        startDate: state.input.startDate,
      })
    );
  }
}

/**
 * Composes 3 existing @aidex/marketing engines into one pipeline —
 * marketing.social.caption → marketing.social.hashtags →
 * marketing.social.schedule — using @aidex/workflow's real
 * Workflow/WorkflowStep/WorkflowExecutor contract. Zero new engines, zero
 * new prompts, zero new providers. Follows `CampaignWorkflow`'s
 * established shape exactly — see that class for the full architecture
 * rationale. Steps communicate forward by mutating the shared
 * WorkflowContext in place — the generated caption and hashtags become
 * the single post `social.schedule` schedules, not independent outputs.
 */
export class SocialWorkflow {
  readonly id = SOCIAL_WORKFLOW_ID;
  readonly name = 'Social';
  readonly description = 'Produces a social publishing package — caption, hashtags, and schedule — from a creative brief.';

  private readonly workflow = new Workflow<SocialWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: SocialWorkflowConfig = {}) {
    this.workflow.addStep(new CaptionStep(config));
    this.workflow.addStep(new HashtagsStep(config));
    this.workflow.addStep(new ScheduleStep(config));
  }

  async run(
    input: SocialWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<SocialPublishingPackage> {
    const state: SocialWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      caption: finalState.caption as SocialCaptionResult,
      hashtags: finalState.hashtags as SocialHashtagsResult,
      schedule: finalState.schedule as SocialScheduleResult,
    };
  }
}
