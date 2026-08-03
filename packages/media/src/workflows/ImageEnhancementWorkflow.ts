import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { MediaEngineId } from '../identifiers.js';
import { ImageOptimizeEngine } from '../engines/ImageOptimizeEngine.js';
import { ImageVariantEngine } from '../engines/ImageVariantEngine.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import type { ImageOptimizeResult, ImageOutputFormat, ImageVariantResult } from '../types/image.types.js';
import type { MediaSource } from '../types/media.types.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const IMAGE_ENHANCEMENT_WORKFLOW_ID = 'media.workflow.image-enhancement';

export interface ImageEnhancementWorkflowInput {
  readonly brief: string;
  readonly source: MediaSource;
  readonly targetFormat?: ImageOutputFormat;
  readonly maxFileSizeKb?: number;
  readonly variantCount?: number;
  readonly outputFormat?: ImageOutputFormat;
}

export interface ImageEnhancementResult {
  readonly optimized: ImageOptimizeResult;
  readonly variants: ImageVariantResult;
}

export interface ImageEnhancementWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: MediaEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface ImageEnhancementWorkflowState {
  readonly input: ImageEnhancementWorkflowInput;
  readonly provider: Provider;
  optimized?: ImageOptimizeResult;
  variants?: ImageVariantResult;
}

/** Runs first — optimizes the caller's original source asset. */
class OptimizeStep implements WorkflowStep<ImageEnhancementWorkflowState> {
  readonly name = MediaEngineId.ImageOptimize;
  private readonly engine: ImageOptimizeEngine;

  constructor(config: ImageEnhancementWorkflowConfig) {
    this.engine = new ImageOptimizeEngine(config);
  }

  async execute(state: ImageEnhancementWorkflowState): Promise<void> {
    state.optimized = await this.engine.execute(
      buildEngineContext(state.provider, MediaEngineId.ImageOptimize, {
        source: state.input.source,
        targetFormat: state.input.targetFormat,
        maxFileSizeKb: state.input.maxFileSizeKb,
      })
    );
  }
}

/**
 * Generates variants of the *optimized* result, not the original source —
 * real engine composition (like `@aidex/design`'s `BrandKitWorkflow` flowing
 * `design.brand`'s output into its later steps), not two independent calls.
 */
class VariantStep implements WorkflowStep<ImageEnhancementWorkflowState> {
  readonly name = MediaEngineId.ImageVariant;
  private readonly engine: ImageVariantEngine;

  constructor(config: ImageEnhancementWorkflowConfig) {
    this.engine = new ImageVariantEngine(config);
  }

  async execute(state: ImageEnhancementWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, OptimizeStep has already
    // completed successfully and state.optimized is guaranteed set.
    const optimized = state.optimized as ImageOptimizeResult;

    state.variants = await this.engine.execute(
      buildEngineContext(state.provider, MediaEngineId.ImageVariant, {
        brief: state.input.brief,
        source: { url: optimized.assetUrl, mimeType: optimized.mimeType } satisfies MediaSource,
        variantCount: state.input.variantCount,
        outputFormat: state.input.outputFormat,
      })
    );
  }
}

/**
 * Composes 2 existing @aidex/media engines into one pipeline —
 * media.image.optimize → media.image.variant — using @aidex/workflow's real
 * Workflow/WorkflowStep/WorkflowExecutor contract. Zero new engines, zero
 * new prompts, zero new providers: every step calls exactly the Engine
 * `@aidex/media` already ships.
 */
export class ImageEnhancementWorkflow {
  readonly id = IMAGE_ENHANCEMENT_WORKFLOW_ID;
  readonly name = 'Image Enhancement';
  readonly description = 'Optimizes an image and then generates variants of the optimized result.';

  private readonly workflow = new Workflow<ImageEnhancementWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: ImageEnhancementWorkflowConfig = {}) {
    this.workflow.addStep(new OptimizeStep(config));
    this.workflow.addStep(new VariantStep(config));
  }

  async run(
    input: ImageEnhancementWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<ImageEnhancementResult> {
    const state: ImageEnhancementWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      optimized: finalState.optimized as ImageOptimizeResult,
      variants: finalState.variants as ImageVariantResult,
    };
  }
}
