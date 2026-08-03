import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { MediaEngineId } from '../identifiers.js';
import { AudioSummarizeEngine } from '../engines/AudioSummarizeEngine.js';
import { AudioTranscribeEngine } from '../engines/AudioTranscribeEngine.js';
import type { MediaEnginePricing } from '../pricing/MediaEnginePricing.js';
import type { AudioSummarizeResult, AudioTranscribeResult } from '../types/audio.types.js';
import type { MediaSource } from '../types/media.types.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const AUDIO_PROCESSING_WORKFLOW_ID = 'media.workflow.audio-processing';

export interface AudioProcessingWorkflowInput {
  readonly source: MediaSource;
  readonly language?: string;
  readonly maxLength?: number;
}

export interface AudioProcessingResult {
  readonly transcript: AudioTranscribeResult;
  readonly summary: AudioSummarizeResult;
}

export interface AudioProcessingWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: MediaEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface AudioProcessingWorkflowState {
  readonly input: AudioProcessingWorkflowInput;
  readonly provider: Provider;
  transcript?: AudioTranscribeResult;
  summary?: AudioSummarizeResult;
}

class TranscribeStep implements WorkflowStep<AudioProcessingWorkflowState> {
  readonly name = MediaEngineId.AudioTranscribe;
  private readonly engine: AudioTranscribeEngine;

  constructor(config: AudioProcessingWorkflowConfig) {
    this.engine = new AudioTranscribeEngine(config);
  }

  async execute(state: AudioProcessingWorkflowState): Promise<void> {
    state.transcript = await this.engine.execute(
      buildEngineContext(state.provider, MediaEngineId.AudioTranscribe, {
        source: state.input.source,
        language: state.input.language,
      })
    );
  }
}

class SummarizeStep implements WorkflowStep<AudioProcessingWorkflowState> {
  readonly name = MediaEngineId.AudioSummarize;
  private readonly engine: AudioSummarizeEngine;

  constructor(config: AudioProcessingWorkflowConfig) {
    this.engine = new AudioSummarizeEngine(config);
  }

  async execute(state: AudioProcessingWorkflowState): Promise<void> {
    state.summary = await this.engine.execute(
      buildEngineContext(state.provider, MediaEngineId.AudioSummarize, {
        source: state.input.source,
        maxLength: state.input.maxLength,
      })
    );
  }
}

/**
 * Composes 2 existing @aidex/media engines into one pipeline —
 * media.audio.transcribe → media.audio.summarize — using @aidex/workflow's
 * real Workflow/WorkflowStep/WorkflowExecutor contract. Zero new engines,
 * zero new prompts, zero new providers.
 *
 * `audio.summarize`'s Phase 1 contract (`AudioSummarizeRequest{source,
 * maxLength?}`) takes a media source, not free text — there is no field
 * for a transcript to flow into. So, like `VideoPreparationWorkflow`,
 * these two steps are NOT data-dependent: both read `state.input.source`
 * independently rather than piping TranscribeStep's output into
 * SummarizeStep. Changing that would require changing
 * `AudioSummarizeRequest`, which Phase 4 explicitly forbids ("do not
 * duplicate engine logic inside workflows" cuts both ways — it also means
 * not reshaping an engine's contract to fit a workflow's convenience).
 * This workflow's value is bundling transcript + summary into one call
 * with shared lifecycle/cancellation/error handling, not fabricating a
 * pipeline the engines don't actually support yet.
 */
export class AudioProcessingWorkflow {
  readonly id = AUDIO_PROCESSING_WORKFLOW_ID;
  readonly name = 'Audio Processing';
  readonly description = 'Transcribes and summarizes an audio asset, bundled as transcript + summary.';

  private readonly workflow = new Workflow<AudioProcessingWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: AudioProcessingWorkflowConfig = {}) {
    this.workflow.addStep(new TranscribeStep(config));
    this.workflow.addStep(new SummarizeStep(config));
  }

  async run(
    input: AudioProcessingWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<AudioProcessingResult> {
    const state: AudioProcessingWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      transcript: finalState.transcript as AudioTranscribeResult,
      summary: finalState.summary as AudioSummarizeResult,
    };
  }
}
