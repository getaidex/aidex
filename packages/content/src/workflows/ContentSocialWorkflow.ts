import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { ContentEngineId } from '../identifiers.js';
import { ContentShortenEngine } from '../engines/ContentShortenEngine.js';
import { ContentSocialEngine } from '../engines/ContentSocialEngine.js';
import { ContentToneEngine } from '../engines/ContentToneEngine.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentShortenResult } from '../types/ContentShorten.js';
import type { ContentSocialResult } from '../types/ContentSocial.js';
import type { ContentToneResult } from '../types/ContentTone.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const CONTENT_SOCIAL_WORKFLOW_ID = 'content.workflow.social';

export interface ContentSocialWorkflowInput {
  readonly topic: string;
  readonly platform?: string;
  readonly tone: string;
  readonly targetLength?: number;
}

export interface ContentSocialPackage {
  readonly social: ContentSocialResult;
  readonly toned: ContentToneResult;
  readonly shortened: ContentShortenResult;
}

export interface ContentSocialWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: ContentEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface ContentSocialWorkflowState {
  readonly input: ContentSocialWorkflowInput;
  readonly provider: Provider;
  social?: ContentSocialResult;
  toned?: ContentToneResult;
  shortened?: ContentShortenResult;
}

class SocialStep implements WorkflowStep<ContentSocialWorkflowState> {
  readonly name = ContentEngineId.Social;
  private readonly engine: ContentSocialEngine;

  constructor(config: ContentSocialWorkflowConfig) {
    this.engine = new ContentSocialEngine(config);
  }

  async execute(state: ContentSocialWorkflowState): Promise<void> {
    state.social = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Social, {
        topic: state.input.topic,
        platform: state.input.platform,
      })
    );
  }
}

/** Retones SocialStep's own generated content — real engine composition, not an independent call. */
class ToneStep implements WorkflowStep<ContentSocialWorkflowState> {
  readonly name = ContentEngineId.Tone;
  private readonly engine: ContentToneEngine;

  constructor(config: ContentSocialWorkflowConfig) {
    this.engine = new ContentToneEngine(config);
  }

  async execute(state: ContentSocialWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, SocialStep has already
    // completed successfully and state.social is guaranteed set.
    const social = state.social as ContentSocialResult;

    state.toned = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Tone, {
        content: social.content,
        tone: state.input.tone,
      })
    );
  }
}

/** Shortens ToneStep's own retoned content — real engine composition, not an independent call. */
class ShortenStep implements WorkflowStep<ContentSocialWorkflowState> {
  readonly name = ContentEngineId.Shorten;
  private readonly engine: ContentShortenEngine;

  constructor(config: ContentSocialWorkflowConfig) {
    this.engine = new ContentShortenEngine(config);
  }

  async execute(state: ContentSocialWorkflowState): Promise<void> {
    const toned = state.toned as ContentToneResult;

    state.shortened = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Shorten, {
        content: toned.content,
        targetLength: state.input.targetLength,
      })
    );
  }
}

/**
 * Composes 3 existing @aidex/content engines into one pipeline —
 * content.social → content.tone → content.shorten — using
 * @aidex/workflow's real Workflow/WorkflowStep/WorkflowExecutor contract.
 * Zero new engines, zero new prompts, zero new providers: every step
 * calls exactly the Engine `@aidex/content` already ships, and no engine's
 * contract is touched. All 3 steps genuinely chain: the generated post is
 * retoned to match brand voice, then shortened to fit platform character
 * limits — the exact "generate, adjust, constrain" lifecycle a real
 * social media pipeline needs.
 */
export class ContentSocialWorkflow {
  readonly id = CONTENT_SOCIAL_WORKFLOW_ID;
  readonly name = 'Content Social';
  readonly description = 'Generates a social post, adjusts its tone, then shortens it to fit platform limits.';

  private readonly workflow = new Workflow<ContentSocialWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: ContentSocialWorkflowConfig = {}) {
    this.workflow.addStep(new SocialStep(config));
    this.workflow.addStep(new ToneStep(config));
    this.workflow.addStep(new ShortenStep(config));
  }

  async run(
    input: ContentSocialWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<ContentSocialPackage> {
    const state: ContentSocialWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      social: finalState.social as ContentSocialResult,
      toned: finalState.toned as ContentToneResult,
      shortened: finalState.shortened as ContentShortenResult,
    };
  }
}
