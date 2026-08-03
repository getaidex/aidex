/**
 * Thrown by WorkflowExecutor.execute() when the supplied AbortSignal fires —
 * either before a step starts, or while one is in flight.
 */
export class WorkflowCancelledError extends Error {
  readonly stepName?: string;

  constructor(stepName?: string) {
    super(stepName ? `Workflow cancelled before step "${stepName}"` : 'Workflow cancelled');
    this.name = 'WorkflowCancelledError';
    this.stepName = stepName;
    Object.setPrototypeOf(this, WorkflowCancelledError.prototype);
  }
}
