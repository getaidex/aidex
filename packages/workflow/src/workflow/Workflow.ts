import type { WorkflowStep } from '../step/WorkflowStep.js';

/**
 * An ordered sequence of WorkflowSteps. Maintains insertion order and
 * nothing else — no execution, no provider knowledge, no application
 * knowledge. Running the steps is WorkflowExecutor's job, not this class's.
 * The optional id enables registration into a WorkflowRegistry by identity
 * (mirrors Engine.id) — omitting it (as every existing Workflow does)
 * changes nothing about addStep()/getSteps() or how WorkflowExecutor runs
 * a Workflow directly.
 */
export class Workflow<TState = Record<string, unknown>> {
  private readonly steps: WorkflowStep<TState>[] = [];

  constructor(readonly id?: string) {}

  addStep(step: WorkflowStep<TState>): void {
    this.steps.push(step);
  }

  getSteps(): WorkflowStep<TState>[] {
    return [...this.steps];
  }
}
