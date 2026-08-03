import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { MarketingEngineId } from '../identifiers.js';
import { EmailCopyEngine } from '../engines/EmailCopyEngine.js';
import { EmailSequenceEngine } from '../engines/EmailSequenceEngine.js';
import { EmailSubjectEngine } from '../engines/EmailSubjectEngine.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type {
  EmailCopyResult,
  EmailSequenceResult,
  EmailSubjectResult,
} from '../types/email.types.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const EMAIL_WORKFLOW_ID = 'marketing.workflow.email';

export interface EmailWorkflowInput {
  readonly brief: string;
  readonly targetAudience?: string;
  readonly callToAction?: string;
  readonly variantCount?: number;
  readonly stepCount?: number;
}

export interface EmailCampaignPackage {
  readonly subjects: EmailSubjectResult;
  readonly copy: EmailCopyResult;
  readonly sequence: EmailSequenceResult;
}

export interface EmailWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface EmailWorkflowState {
  readonly input: EmailWorkflowInput;
  readonly provider: Provider;
  subjects?: EmailSubjectResult;
  copy?: EmailCopyResult;
  sequence?: EmailSequenceResult;
}

class SubjectStep implements WorkflowStep<EmailWorkflowState> {
  readonly name = MarketingEngineId.EmailSubject;
  private readonly engine: EmailSubjectEngine;

  constructor(config: EmailWorkflowConfig) {
    this.engine = new EmailSubjectEngine(config);
  }

  async execute(state: EmailWorkflowState): Promise<void> {
    state.subjects = await this.engine.execute(
      buildEngineContext(state.provider, MarketingEngineId.EmailSubject, {
        brief: state.input.brief,
        targetAudience: state.input.targetAudience,
        variantCount: state.input.variantCount,
      })
    );
  }
}

/** Folds SubjectStep's top candidate into its own brief as inspiration — real engine composition, not an independent call. */
class CopyStep implements WorkflowStep<EmailWorkflowState> {
  readonly name = MarketingEngineId.EmailCopy;
  private readonly engine: EmailCopyEngine;

  constructor(config: EmailWorkflowConfig) {
    this.engine = new EmailCopyEngine(config);
  }

  async execute(state: EmailWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, SubjectStep has already
    // completed successfully and state.subjects is guaranteed set.
    const subjects = state.subjects as EmailSubjectResult;
    const topSubject = subjects.subjects[0];
    const brief = topSubject
      ? `${state.input.brief} Use this subject line as inspiration: ${topSubject}`
      : state.input.brief;

    state.copy = await this.engine.execute(
      buildEngineContext(state.provider, MarketingEngineId.EmailCopy, {
        brief,
        targetAudience: state.input.targetAudience,
        callToAction: state.input.callToAction,
      })
    );
  }
}

/** Folds CopyStep's own body into its brief as the campaign's core message — real engine composition, not an independent call. */
class SequenceStep implements WorkflowStep<EmailWorkflowState> {
  readonly name = MarketingEngineId.EmailSequence;
  private readonly engine: EmailSequenceEngine;

  constructor(config: EmailWorkflowConfig) {
    this.engine = new EmailSequenceEngine(config);
  }

  async execute(state: EmailWorkflowState): Promise<void> {
    const copy = state.copy as EmailCopyResult;
    const brief = `${state.input.brief} The campaign's core message is: ${copy.body}`;

    state.sequence = await this.engine.execute(
      buildEngineContext(state.provider, MarketingEngineId.EmailSequence, {
        brief,
        targetAudience: state.input.targetAudience,
        stepCount: state.input.stepCount,
      })
    );
  }
}

/**
 * Composes 3 existing @aidex/marketing engines into one pipeline —
 * marketing.email.subject → marketing.email.copy →
 * marketing.email.sequence — using @aidex/workflow's real
 * Workflow/WorkflowStep/WorkflowExecutor contract. Zero new engines, zero
 * new prompts, zero new providers. Follows `CampaignWorkflow`'s
 * established shape exactly — see that class for the full architecture
 * rationale. Steps communicate forward by folding each prior step's own
 * output into the next step's brief text — email.copy is written with
 * email.subject's top candidate as inspiration, and email.sequence is
 * built around email.copy's own body as the campaign's core message.
 */
export class EmailWorkflow {
  readonly id = EMAIL_WORKFLOW_ID;
  readonly name = 'Email';
  readonly description = 'Produces an email campaign package — subjects, copy, and a drip sequence — from a creative brief.';

  private readonly workflow = new Workflow<EmailWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: EmailWorkflowConfig = {}) {
    this.workflow.addStep(new SubjectStep(config));
    this.workflow.addStep(new CopyStep(config));
    this.workflow.addStep(new SequenceStep(config));
  }

  async run(
    input: EmailWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<EmailCampaignPackage> {
    const state: EmailWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      subjects: finalState.subjects as EmailSubjectResult,
      copy: finalState.copy as EmailCopyResult,
      sequence: finalState.sequence as EmailSequenceResult,
    };
  }
}
