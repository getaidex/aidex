import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { ContentEngineId } from '../identifiers.js';
import { ContentProductDescriptionEngine } from '../engines/ContentProductDescriptionEngine.js';
import { ContentSeoEngine } from '../engines/ContentSeoEngine.js';
import { ContentTaglineEngine } from '../engines/ContentTaglineEngine.js';
import type { ContentEnginePricing } from '../pricing/ContentEnginePricing.js';
import type { ContentProductDescriptionResult } from '../types/ContentProductDescription.js';
import type { ContentSeoResult } from '../types/ContentSeo.js';
import type { ContentTaglineResult } from '../types/ContentTagline.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const CONTENT_PRODUCT_LAUNCH_WORKFLOW_ID = 'content.workflow.product-launch';

export interface ContentProductLaunchWorkflowInput {
  readonly productName: string;
  readonly features?: readonly string[];
  readonly tone?: string;
  readonly targetKeywords?: readonly string[];
  readonly taglineCount?: number;
}

export interface ContentProductLaunchPackage {
  readonly description: ContentProductDescriptionResult;
  readonly seo: ContentSeoResult;
  readonly taglines: ContentTaglineResult;
}

export interface ContentProductLaunchWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: ContentEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface ContentProductLaunchWorkflowState {
  readonly input: ContentProductLaunchWorkflowInput;
  readonly provider: Provider;
  description?: ContentProductDescriptionResult;
  seo?: ContentSeoResult;
  taglines?: ContentTaglineResult;
}

class ProductDescriptionStep implements WorkflowStep<ContentProductLaunchWorkflowState> {
  readonly name = ContentEngineId.ProductDescription;
  private readonly engine: ContentProductDescriptionEngine;

  constructor(config: ContentProductLaunchWorkflowConfig) {
    this.engine = new ContentProductDescriptionEngine(config);
  }

  async execute(state: ContentProductLaunchWorkflowState): Promise<void> {
    state.description = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.ProductDescription, {
        productName: state.input.productName,
        features: state.input.features,
        tone: state.input.tone,
      })
    );
  }
}

/** Optimizes ProductDescriptionStep's own generated description — real engine composition, not an independent call. */
class SeoStep implements WorkflowStep<ContentProductLaunchWorkflowState> {
  readonly name = ContentEngineId.Seo;
  private readonly engine: ContentSeoEngine;

  constructor(config: ContentProductLaunchWorkflowConfig) {
    this.engine = new ContentSeoEngine(config);
  }

  async execute(state: ContentProductLaunchWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, ProductDescriptionStep has
    // already completed successfully and state.description is
    // guaranteed set.
    const description = state.description as ContentProductDescriptionResult;

    state.seo = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Seo, {
        content: description.description,
        targetKeywords: state.input.targetKeywords,
      })
    );
  }
}

/** Uses ProductDescriptionStep's own description as tagline context — real engine composition (fan-out from a shared upstream result), not an independent call. */
class TaglineStep implements WorkflowStep<ContentProductLaunchWorkflowState> {
  readonly name = ContentEngineId.Tagline;
  private readonly engine: ContentTaglineEngine;

  constructor(config: ContentProductLaunchWorkflowConfig) {
    this.engine = new ContentTaglineEngine(config);
  }

  async execute(state: ContentProductLaunchWorkflowState): Promise<void> {
    const description = state.description as ContentProductDescriptionResult;

    state.taglines = await this.engine.execute(
      buildEngineContext(state.provider, ContentEngineId.Tagline, {
        brandName: state.input.productName,
        description: description.description,
        count: state.input.taglineCount,
      })
    );
  }
}

/**
 * Composes 3 existing @aidex/content engines into one pipeline —
 * content.product-description, fanning out into content.seo and
 * content.tagline — using @aidex/workflow's real
 * Workflow/WorkflowStep/WorkflowExecutor contract. Zero new engines, zero
 * new prompts, zero new providers: every step calls exactly the Engine
 * `@aidex/content` already ships, and no engine's contract is touched.
 * Both SeoStep and TaglineStep genuinely chain from
 * ProductDescriptionStep's own output (its `description` becomes both
 * the SEO-optimization target and the tagline's brand context) — a
 * "fan-out from one shared upstream result" composition, the same
 * pattern `ContentRepurposeWorkflow` uses.
 */
export class ContentProductLaunchWorkflow {
  readonly id = CONTENT_PRODUCT_LAUNCH_WORKFLOW_ID;
  readonly name = 'Content Product Launch';
  readonly description = 'Writes a product description, optimizes it for SEO, and generates tagline options from it.';

  private readonly workflow = new Workflow<ContentProductLaunchWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: ContentProductLaunchWorkflowConfig = {}) {
    this.workflow.addStep(new ProductDescriptionStep(config));
    this.workflow.addStep(new SeoStep(config));
    this.workflow.addStep(new TaglineStep(config));
  }

  async run(
    input: ContentProductLaunchWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<ContentProductLaunchPackage> {
    const state: ContentProductLaunchWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      description: finalState.description as ContentProductDescriptionResult,
      seo: finalState.seo as ContentSeoResult,
      taglines: finalState.taglines as ContentTaglineResult,
    };
  }
}
