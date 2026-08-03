import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { ContentEngineId } from '../identifiers.js';
import { ContentExpandEngine } from '../engines/ContentExpandEngine.js';
import { ContentGenerateEngine } from '../engines/ContentGenerateEngine.js';
import { ContentRewriteEngine } from '../engines/ContentRewriteEngine.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentExpandResult } from '../types/ContentExpand.js';
import type { ContentGenerateResult } from '../types/ContentGenerate.js';
import type { ContentRewriteResult } from '../types/ContentRewrite.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const CONTENT_ARTICLE_WORKFLOW_ID = 'content.workflow.article';

export interface ContentArticleWorkflowInput {
  readonly topic: string;
  readonly keywords?: readonly string[];
  readonly tone?: string;
  readonly length?: number;
  readonly rewriteInstructions?: string;
  readonly targetLength?: number;
}

export interface ContentArticlePackage {
  readonly generated: ContentGenerateResult;
  readonly rewritten: ContentRewriteResult;
  readonly expanded: ContentExpandResult;
}

export interface ContentArticleWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: ContentEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface ContentArticleWorkflowState {
  readonly input: ContentArticleWorkflowInput;
  readonly provider: Provider;
  generated?: ContentGenerateResult;
  rewritten?: ContentRewriteResult;
  expanded?: ContentExpandResult;
}

class GenerateStep implements WorkflowStep<ContentArticleWorkflowState> {
  readonly name = ContentEngineId.Generate;
  private readonly engine: ContentGenerateEngine;

  constructor(config: ContentArticleWorkflowConfig) {
    this.engine = new ContentGenerateEngine(config);
  }

  async execute(state: ContentArticleWorkflowState): Promise<void> {
    state.generated = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Generate, {
        topic: state.input.topic,
        keywords: state.input.keywords,
        tone: state.input.tone,
        length: state.input.length,
      })
    );
  }
}

/** Rewrites GenerateStep's own draft — real engine composition, not an independent call. */
class RewriteStep implements WorkflowStep<ContentArticleWorkflowState> {
  readonly name = ContentEngineId.Rewrite;
  private readonly engine: ContentRewriteEngine;

  constructor(config: ContentArticleWorkflowConfig) {
    this.engine = new ContentRewriteEngine(config);
  }

  async execute(state: ContentArticleWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, GenerateStep has already
    // completed successfully and state.generated is guaranteed set.
    const generated = state.generated as ContentGenerateResult;

    state.rewritten = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Rewrite, {
        content: generated.content,
        instructions: state.input.rewriteInstructions,
      })
    );
  }
}

/** Expands RewriteStep's own rewritten draft — real engine composition, not an independent call. */
class ExpandStep implements WorkflowStep<ContentArticleWorkflowState> {
  readonly name = ContentEngineId.Expand;
  private readonly engine: ContentExpandEngine;

  constructor(config: ContentArticleWorkflowConfig) {
    this.engine = new ContentExpandEngine(config);
  }

  async execute(state: ContentArticleWorkflowState): Promise<void> {
    const rewritten = state.rewritten as ContentRewriteResult;

    state.expanded = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Expand, {
        content: rewritten.rewrittenContent,
        targetLength: state.input.targetLength,
      })
    );
  }
}

/**
 * Composes 3 existing @aidex/content engines into one pipeline —
 * content.generate → content.rewrite → content.expand — using
 * @aidex/workflow's real Workflow/WorkflowStep/WorkflowExecutor contract.
 * Zero new engines, zero new prompts, zero new providers: every step
 * calls exactly the Engine `@aidex/content` already ships, and no engine's
 * contract is touched. All 3 steps genuinely chain — draft from a topic,
 * refine per instructions, then expand to a target length — the classic
 * "draft, refine, expand" long-form article lifecycle.
 */
export class ContentArticleWorkflow {
  readonly id = CONTENT_ARTICLE_WORKFLOW_ID;
  readonly name = 'Content Article';
  readonly description = 'Drafts an article from a topic, rewrites it per instructions, then expands it to a target length.';

  private readonly workflow = new Workflow<ContentArticleWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: ContentArticleWorkflowConfig = {}) {
    this.workflow.addStep(new GenerateStep(config));
    this.workflow.addStep(new RewriteStep(config));
    this.workflow.addStep(new ExpandStep(config));
  }

  async run(
    input: ContentArticleWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<ContentArticlePackage> {
    const state: ContentArticleWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      generated: finalState.generated as ContentGenerateResult,
      rewritten: finalState.rewritten as ContentRewriteResult,
      expanded: finalState.expanded as ContentExpandResult,
    };
  }
}
