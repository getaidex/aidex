import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { ContentEngineId } from '../identifiers.js';
import { ContentBlogEngine } from '../engines/ContentBlogEngine.js';
import { ContentHeadlineEngine } from '../engines/ContentHeadlineEngine.js';
import { ContentSeoEngine } from '../engines/ContentSeoEngine.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentBlogResult } from '../types/ContentBlog.js';
import type { ContentHeadlineResult } from '../types/ContentHeadline.js';
import type { ContentSeoResult } from '../types/ContentSeo.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const CONTENT_BLOG_WORKFLOW_ID = 'content.workflow.blog';

export interface ContentBlogWorkflowInput {
  readonly topic: string;
  readonly keywords?: readonly string[];
  readonly tone?: string;
  readonly targetLength?: number;
  readonly targetKeywords?: readonly string[];
  readonly headlineCount?: number;
}

export interface ContentBlogPackage {
  readonly blog: ContentBlogResult;
  readonly seo: ContentSeoResult;
  readonly headlines: ContentHeadlineResult;
}

export interface ContentBlogWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: ContentEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface ContentBlogWorkflowState {
  readonly input: ContentBlogWorkflowInput;
  readonly provider: Provider;
  blog?: ContentBlogResult;
  seo?: ContentSeoResult;
  headlines?: ContentHeadlineResult;
}

class BlogStep implements WorkflowStep<ContentBlogWorkflowState> {
  readonly name = ContentEngineId.Blog;
  private readonly engine: ContentBlogEngine;

  constructor(config: ContentBlogWorkflowConfig) {
    this.engine = new ContentBlogEngine(config);
  }

  async execute(state: ContentBlogWorkflowState): Promise<void> {
    state.blog = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Blog, {
        topic: state.input.topic,
        keywords: state.input.keywords,
        tone: state.input.tone,
        targetLength: state.input.targetLength,
      })
    );
  }
}

/** Optimizes BlogStep's own generated content — real engine composition, not an independent call. */
class SeoStep implements WorkflowStep<ContentBlogWorkflowState> {
  readonly name = ContentEngineId.Seo;
  private readonly engine: ContentSeoEngine;

  constructor(config: ContentBlogWorkflowConfig) {
    this.engine = new ContentSeoEngine(config);
  }

  async execute(state: ContentBlogWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, BlogStep has already
    // completed successfully and state.blog is guaranteed set.
    const blog = state.blog as ContentBlogResult;

    state.seo = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Seo, {
        content: blog.content,
        targetKeywords: state.input.targetKeywords,
      })
    );
  }
}

/** Generates alternate headline variants for the original topic — NOT chained from BlogStep, since content.headline takes a topic, not existing content. Documented, honest independence. */
class HeadlineStep implements WorkflowStep<ContentBlogWorkflowState> {
  readonly name = ContentEngineId.Headline;
  private readonly engine: ContentHeadlineEngine;

  constructor(config: ContentBlogWorkflowConfig) {
    this.engine = new ContentHeadlineEngine(config);
  }

  async execute(state: ContentBlogWorkflowState): Promise<void> {
    state.headlines = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Headline, {
        topic: state.input.topic,
        count: state.input.headlineCount,
      })
    );
  }
}

/**
 * Composes 3 existing @aidex/content engines into one pipeline —
 * content.blog → content.seo, plus content.headline — using
 * @aidex/workflow's real Workflow/WorkflowStep/WorkflowExecutor contract.
 * Zero new engines, zero new prompts, zero new providers: every step
 * calls exactly the Engine `@aidex/content` already ships, and no engine's
 * contract is touched. `content.seo` genuinely chains from `content.blog`'s
 * own generated content; `content.headline` is deliberately NOT chained
 * — it takes a `topic`, not existing content, so it generates alternate
 * headline ideas for the same original topic rather than reusing
 * `content.blog`'s own title.
 */
export class ContentBlogWorkflow {
  readonly id = CONTENT_BLOG_WORKFLOW_ID;
  readonly name = 'Content Blog';
  readonly description = 'Generates a blog post, optimizes it for SEO, and produces alternate headline ideas.';

  private readonly workflow = new Workflow<ContentBlogWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: ContentBlogWorkflowConfig = {}) {
    this.workflow.addStep(new BlogStep(config));
    this.workflow.addStep(new SeoStep(config));
    this.workflow.addStep(new HeadlineStep(config));
  }

  async run(
    input: ContentBlogWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<ContentBlogPackage> {
    const state: ContentBlogWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      blog: finalState.blog as ContentBlogResult,
      seo: finalState.seo as ContentSeoResult,
      headlines: finalState.headlines as ContentHeadlineResult,
    };
  }
}
