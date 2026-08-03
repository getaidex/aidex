import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { ContentEngineId } from '../identifiers.js';
import { ContentEmailEngine } from '../engines/ContentEmailEngine.js';
import { ContentToneEngine } from '../engines/ContentToneEngine.js';
import { ContentTranslateEngine } from '../engines/ContentTranslateEngine.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentEmailResult } from '../types/ContentEmail.js';
import type { ContentToneResult } from '../types/ContentTone.js';
import type { ContentTranslateResult } from '../types/ContentTranslate.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const CONTENT_EMAIL_WORKFLOW_ID = 'content.workflow.email';

export interface ContentEmailWorkflowInput {
  readonly purpose: string;
  readonly tone: string;
  readonly recipientContext?: string;
  readonly targetLanguage: string;
  readonly sourceLanguage?: string;
}

export interface ContentEmailPackage {
  readonly email: ContentEmailResult;
  readonly toned: ContentToneResult;
  readonly translated: ContentTranslateResult;
}

export interface ContentEmailWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: ContentEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface ContentEmailWorkflowState {
  readonly input: ContentEmailWorkflowInput;
  readonly provider: Provider;
  email?: ContentEmailResult;
  toned?: ContentToneResult;
  translated?: ContentTranslateResult;
}

class EmailStep implements WorkflowStep<ContentEmailWorkflowState> {
  readonly name = ContentEngineId.Email;
  private readonly engine: ContentEmailEngine;

  constructor(config: ContentEmailWorkflowConfig) {
    this.engine = new ContentEmailEngine(config);
  }

  async execute(state: ContentEmailWorkflowState): Promise<void> {
    state.email = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Email, {
        purpose: state.input.purpose,
        recipientContext: state.input.recipientContext,
      })
    );
  }
}

/**
 * Retones EmailStep's own generated body — real engine composition, not
 * an independent call. Scope note: only `body` flows through tone/
 * translate, since `content.tone`/`content.translate` each operate on
 * one `content` string, not a `{subject, body}` pair — `subject` stays
 * as EmailStep produced it. See the workflow's own doc comment.
 */
class ToneStep implements WorkflowStep<ContentEmailWorkflowState> {
  readonly name = ContentEngineId.Tone;
  private readonly engine: ContentToneEngine;

  constructor(config: ContentEmailWorkflowConfig) {
    this.engine = new ContentToneEngine(config);
  }

  async execute(state: ContentEmailWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, EmailStep has already
    // completed successfully and state.email is guaranteed set.
    const email = state.email as ContentEmailResult;

    state.toned = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Tone, {
        content: email.body,
        tone: state.input.tone,
      })
    );
  }
}

/** Translates ToneStep's own retoned body — real engine composition, not an independent call. */
class TranslateStep implements WorkflowStep<ContentEmailWorkflowState> {
  readonly name = ContentEngineId.Translate;
  private readonly engine: ContentTranslateEngine;

  constructor(config: ContentEmailWorkflowConfig) {
    this.engine = new ContentTranslateEngine(config);
  }

  async execute(state: ContentEmailWorkflowState): Promise<void> {
    const toned = state.toned as ContentToneResult;

    state.translated = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Translate, {
        content: toned.content,
        targetLanguage: state.input.targetLanguage,
        sourceLanguage: state.input.sourceLanguage,
      })
    );
  }
}

/**
 * Composes 3 existing @aidex/content engines into one pipeline —
 * content.email → content.tone → content.translate — using
 * @aidex/workflow's real Workflow/WorkflowStep/WorkflowExecutor contract.
 * Zero new engines, zero new prompts, zero new providers: every step
 * calls exactly the Engine `@aidex/content` already ships, and no engine's
 * contract is touched. All 3 steps genuinely chain on the email body:
 * compose, adjust tone to match the sender's voice, then localize for a
 * target-language audience. `email.subject` is deliberately left
 * untouched by this pipeline — `content.tone`/`content.translate` only
 * ever process one `content` string, not a `{subject, body}` pair — a
 * documented scope choice, not a bug.
 */
export class ContentEmailWorkflow {
  readonly id = CONTENT_EMAIL_WORKFLOW_ID;
  readonly name = 'Content Email';
  readonly description = 'Generates an email, adjusts its tone, then translates the body for a target-language audience.';

  private readonly workflow = new Workflow<ContentEmailWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: ContentEmailWorkflowConfig = {}) {
    this.workflow.addStep(new EmailStep(config));
    this.workflow.addStep(new ToneStep(config));
    this.workflow.addStep(new TranslateStep(config));
  }

  async run(
    input: ContentEmailWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<ContentEmailPackage> {
    const state: ContentEmailWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      email: finalState.email as ContentEmailResult,
      toned: finalState.toned as ContentToneResult,
      translated: finalState.translated as ContentTranslateResult,
    };
  }
}
