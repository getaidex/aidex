import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { ContentEngineId } from '../identifiers.js';
import { ContentEmailEngine } from '../engines/ContentEmailEngine.js';
import { ContentSocialEngine } from '../engines/ContentSocialEngine.js';
import { ContentSummarizeEngine } from '../engines/ContentSummarizeEngine.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentEmailResult } from '../types/ContentEmail.js';
import type { ContentSocialResult } from '../types/ContentSocial.js';
import type { ContentSummarizeResult } from '../types/ContentSummarize.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const CONTENT_REPURPOSE_WORKFLOW_ID = 'content.workflow.repurpose';

export interface ContentRepurposeWorkflowInput {
  readonly content: string;
  readonly maxLength?: number;
  readonly platform?: string;
  readonly socialTone?: string;
  readonly emailTone?: string;
}

export interface ContentRepurposePackage {
  readonly summary: ContentSummarizeResult;
  readonly social: ContentSocialResult;
  readonly email: ContentEmailResult;
}

export interface ContentRepurposeWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: ContentEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface ContentRepurposeWorkflowState {
  readonly input: ContentRepurposeWorkflowInput;
  readonly provider: Provider;
  summary?: ContentSummarizeResult;
  social?: ContentSocialResult;
  email?: ContentEmailResult;
}

class SummarizeStep implements WorkflowStep<ContentRepurposeWorkflowState> {
  readonly name = ContentEngineId.Summarize;
  private readonly engine: ContentSummarizeEngine;

  constructor(config: ContentRepurposeWorkflowConfig) {
    this.engine = new ContentSummarizeEngine(config);
  }

  async execute(state: ContentRepurposeWorkflowState): Promise<void> {
    state.summary = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Summarize, {
        content: state.input.content,
        maxLength: state.input.maxLength,
      })
    );
  }
}

/** Uses SummarizeStep's own summary as the social post's topic — real engine composition (fan-out from a shared upstream result), not an independent call. */
class SocialStep implements WorkflowStep<ContentRepurposeWorkflowState> {
  readonly name = ContentEngineId.Social;
  private readonly engine: ContentSocialEngine;

  constructor(config: ContentRepurposeWorkflowConfig) {
    this.engine = new ContentSocialEngine(config);
  }

  async execute(state: ContentRepurposeWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, SummarizeStep has already
    // completed successfully and state.summary is guaranteed set.
    const summary = state.summary as ContentSummarizeResult;

    state.social = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Social, {
        topic: summary.summary,
        platform: state.input.platform,
        tone: state.input.socialTone,
      })
    );
  }
}

/** Uses SummarizeStep's own summary as the email's purpose — real engine composition (fan-out from a shared upstream result), not an independent call. */
class EmailStep implements WorkflowStep<ContentRepurposeWorkflowState> {
  readonly name = ContentEngineId.Email;
  private readonly engine: ContentEmailEngine;

  constructor(config: ContentRepurposeWorkflowConfig) {
    this.engine = new ContentEmailEngine(config);
  }

  async execute(state: ContentRepurposeWorkflowState): Promise<void> {
    const summary = state.summary as ContentSummarizeResult;

    state.email = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Email, {
        purpose: summary.summary,
        tone: state.input.emailTone,
      })
    );
  }
}

/**
 * Composes 3 existing @aidex/content engines into one pipeline —
 * content.summarize, fanning out into content.social and content.email —
 * using @aidex/workflow's real Workflow/WorkflowStep/WorkflowExecutor
 * contract. Zero new engines, zero new prompts, zero new providers: every
 * step calls exactly the Engine `@aidex/content` already ships, and no
 * engine's contract is touched. Both SocialStep and EmailStep genuinely
 * chain from SummarizeStep's own output (its `summary` becomes the social
 * post's `topic` and the email's `purpose`) rather than from each other —
 * a "fan-out from one shared upstream result" composition, still real
 * data flow, just not linear. This is the classic content-repurposing
 * lifecycle: condense long-form content once, then adapt that condensed
 * message across formats.
 */
export class ContentRepurposeWorkflow {
  readonly id = CONTENT_REPURPOSE_WORKFLOW_ID;
  readonly name = 'Content Repurpose';
  readonly description = 'Summarizes existing content, then repurposes the summary into a social post and an email.';

  private readonly workflow = new Workflow<ContentRepurposeWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: ContentRepurposeWorkflowConfig = {}) {
    this.workflow.addStep(new SummarizeStep(config));
    this.workflow.addStep(new SocialStep(config));
    this.workflow.addStep(new EmailStep(config));
  }

  async run(
    input: ContentRepurposeWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<ContentRepurposePackage> {
    const state: ContentRepurposeWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      summary: finalState.summary as ContentSummarizeResult,
      social: finalState.social as ContentSocialResult,
      email: finalState.email as ContentEmailResult,
    };
  }
}
