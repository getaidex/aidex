import type { WorkflowContext } from '../types/WorkflowContext.js';

/**
 * The contract every workflow step satisfies. A step receives the shared
 * WorkflowContext — the same instance every other step in the same Workflow
 * receives — and resolves once its work is done. This is an interface only;
 * WorkflowStep ships no implementation.
 */
export interface WorkflowStep<TState = Record<string, unknown>> {
  readonly name: string;
  execute(context: WorkflowContext<TState>): Promise<void>;
}
