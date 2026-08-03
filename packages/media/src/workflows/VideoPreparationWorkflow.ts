import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { MediaEngineId } from '../identifiers.js';
import { VideoStoryboardEngine } from '../engines/VideoStoryboardEngine.js';
import { VideoThumbnailEngine } from '../engines/VideoThumbnailEngine.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import type { VideoStoryboardResult, VideoThumbnailResult } from '../types/video.types.js';
import type { MediaSource } from '../types/media.types.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const VIDEO_PREPARATION_WORKFLOW_ID = 'media.workflow.video-preparation';

export interface VideoPreparationWorkflowInput {
  readonly brief: string;
  readonly source: MediaSource;
  readonly sceneCount?: number;
  readonly timestampSeconds?: number;
  readonly outputFormat?: 'png' | 'jpg';
}

export interface VideoPreparationResult {
  readonly storyboard: VideoStoryboardResult;
  readonly thumbnail: VideoThumbnailResult;
}

export interface VideoPreparationWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: MediaEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface VideoPreparationWorkflowState {
  readonly input: VideoPreparationWorkflowInput;
  readonly provider: Provider;
  storyboard?: VideoStoryboardResult;
  thumbnail?: VideoThumbnailResult;
}

class StoryboardStep implements WorkflowStep<VideoPreparationWorkflowState> {
  readonly name = MediaEngineId.VideoStoryboard;
  private readonly engine: VideoStoryboardEngine;

  constructor(config: VideoPreparationWorkflowConfig) {
    this.engine = new VideoStoryboardEngine(config);
  }

  async execute(state: VideoPreparationWorkflowState): Promise<void> {
    state.storyboard = await this.engine.execute(
      buildEngineContext(state.provider, MediaEngineId.VideoStoryboard, {
        brief: state.input.brief,
        sceneCount: state.input.sceneCount,
      })
    );
  }
}

class ThumbnailStep implements WorkflowStep<VideoPreparationWorkflowState> {
  readonly name = MediaEngineId.VideoThumbnail;
  private readonly engine: VideoThumbnailEngine;

  constructor(config: VideoPreparationWorkflowConfig) {
    this.engine = new VideoThumbnailEngine(config);
  }

  async execute(state: VideoPreparationWorkflowState): Promise<void> {
    state.thumbnail = await this.engine.execute(
      buildEngineContext(state.provider, MediaEngineId.VideoThumbnail, {
        source: state.input.source,
        timestampSeconds: state.input.timestampSeconds,
        outputFormat: state.input.outputFormat,
      })
    );
  }
}

/**
 * Composes 2 existing @aidex/media engines into one pipeline —
 * media.video.storyboard → media.video.thumbnail — using @aidex/workflow's
 * real Workflow/WorkflowStep/WorkflowExecutor contract. Zero new engines,
 * zero new prompts, zero new providers.
 *
 * Unlike `ImageEnhancementWorkflow`, these two steps are NOT
 * data-dependent: `video.storyboard` plans scenes from `brief` (planning
 * text, no asset produced), and `video.thumbnail` extracts a frame from
 * `source` (the caller's original video). There is no meaningful way for
 * one's output to feed the other's input given their existing Phase 1
 * contracts, so both steps read from the shared workflow input directly.
 * They still run through the same sequential Workflow/WorkflowExecutor —
 * ordering, lifecycle events, and error propagation are identical to a
 * data-dependent pipeline — this workflow's value is bundling the two
 * results into one "prepared video package" call, not fabricating a data
 * dependency that doesn't exist.
 */
export class VideoPreparationWorkflow {
  readonly id = VIDEO_PREPARATION_WORKFLOW_ID;
  readonly name = 'Video Preparation';
  readonly description = 'Plans a video storyboard and extracts a thumbnail, bundled as one prepared package.';

  private readonly workflow = new Workflow<VideoPreparationWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: VideoPreparationWorkflowConfig = {}) {
    this.workflow.addStep(new StoryboardStep(config));
    this.workflow.addStep(new ThumbnailStep(config));
  }

  async run(
    input: VideoPreparationWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<VideoPreparationResult> {
    const state: VideoPreparationWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      storyboard: finalState.storyboard as VideoStoryboardResult,
      thumbnail: finalState.thumbnail as VideoThumbnailResult,
    };
  }
}
