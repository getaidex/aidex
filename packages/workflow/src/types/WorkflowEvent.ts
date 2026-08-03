/**
 * The observability event stream a WorkflowExecutor emits, if the caller
 * opts in via WorkflowExecutionOptions.onEvent. The executor never logs or
 * persists anything itself — this is a plain callback hook so a caller (or
 * a future observability layer) can subscribe without the executor knowing
 * or caring what happens with the events.
 */
export type WorkflowEventType =
  | 'workflow-started'
  | 'workflow-completed'
  | 'workflow-cancelled'
  | 'step-started'
  | 'step-completed'
  | 'step-failed';

export interface WorkflowEvent {
  readonly type: WorkflowEventType;
  readonly stepName?: string;
  readonly error?: unknown;
}

export interface WorkflowExecutionOptions {
  /** Cooperative cancellation — checked before each step and raced against an in-flight one. */
  readonly signal?: AbortSignal;
  /** Opt-in observability hook; never called unless supplied. */
  readonly onEvent?: (event: WorkflowEvent) => void;
}
