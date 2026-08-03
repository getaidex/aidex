/**
 * Workflow — sequential multi-step execution, observability events, and
 * cancellation. @aidex/workflow is fully standalone (no dependency on
 * @aidex/core or the SDK) — a Workflow is just an ordered list of steps
 * sharing one context object.
 */
import {
  Workflow,
  WorkflowExecutor,
  type WorkflowStep,
  type WorkflowEvent,
} from '@aidex/workflow';

interface PipelineState {
  log: string[];
}

function makeStep(name: string, delayMs = 0): WorkflowStep<PipelineState> {
  return {
    name,
    async execute(context) {
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      context.log.push(name);
    },
  };
}

// --- Multi-step workflow with event callbacks ---
const workflow = new Workflow<PipelineState>();
workflow.addStep(makeStep('fetch'));
workflow.addStep(makeStep('transform'));
workflow.addStep(makeStep('save'));

const events: string[] = [];
const context: PipelineState = { log: [] };

await new WorkflowExecutor().execute(workflow, context, {
  onEvent: (event: WorkflowEvent) => events.push(event.type),
});

console.log('Steps ran:     ', context.log);
console.log('Events emitted:', events);

// --- Cancellation ---
const cancellableWorkflow = new Workflow<PipelineState>();
cancellableWorkflow.addStep(makeStep('slow-step', 1000));
cancellableWorkflow.addStep(makeStep('never-runs'));

const controller = new AbortController();
setTimeout(() => controller.abort(), 10);

try {
  await new WorkflowExecutor().execute(cancellableWorkflow, { log: [] }, {
    signal: controller.signal,
  });
} catch (error) {
  console.log('Cancelled as expected:', (error as Error).name);
}
