import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { DesignPresentationEngine } from '../engines/DesignPresentationEngine.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import type { DesignPresentationResult } from '../types/DesignPresentation.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const PRESENTATION_WORKFLOW_ID = 'design.workflow.presentation';

export interface PresentationWorkflowInput {
  readonly topic: string;
  readonly audience?: string;
  readonly style?: string;
}

export interface PresentationWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  readonly pricing?: DesignEnginePricing;
  /** Optional; when supplied, the composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface PresentationWorkflowState {
  readonly input: PresentationWorkflowInput;
  readonly provider: Provider;
  presentation?: DesignPresentationResult;
}

class PresentationStep implements WorkflowStep<PresentationWorkflowState> {
  readonly name = 'design.presentation';
  private readonly engine: DesignPresentationEngine;

  constructor(config: PresentationWorkflowConfig) {
    this.engine = new DesignPresentationEngine(config);
  }

  async execute(state: PresentationWorkflowState): Promise<void> {
    state.presentation = await this.engine.execute(
      buildEngineContext(state.provider, 'design.presentation', {
        brief: state.input.topic,
        targetAudience: state.input.audience,
        style: state.input.style,
      })
    );
  }
}

/**
 * A single-step workflow wrapping `design.presentation`, built with the
 * exact same Workflow/WorkflowStep/WorkflowExecutor contract
 * `BrandKitWorkflow` uses — not a special case, so a future step (e.g.
 * generating a companion one-pager) can be inserted without restructuring
 * anything. Zero new engines, zero new prompts, zero new providers.
 */
export class PresentationWorkflow {
  readonly id = PRESENTATION_WORKFLOW_ID;
  readonly name = 'Presentation';
  readonly description = 'Generates a set of presentation slide designs from a topic.';

  private readonly workflow = new Workflow<PresentationWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: PresentationWorkflowConfig = {}) {
    this.workflow.addStep(new PresentationStep(config));
  }

  async run(
    input: PresentationWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<DesignPresentationResult> {
    const state: PresentationWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return finalState.presentation as DesignPresentationResult;
  }
}
