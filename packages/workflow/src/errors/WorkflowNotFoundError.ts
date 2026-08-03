/**
 * Thrown by WorkflowRegistry.execute() when no workflow is registered
 * under the given id. Mirrors @aidex/engines' EngineNotFoundError shape.
 */
export class WorkflowNotFoundError extends Error {
  readonly workflowId: string;

  constructor(workflowId: string) {
    super(`Workflow not found: "${workflowId}"`);
    this.name = 'WorkflowNotFoundError';
    this.workflowId = workflowId;
    Object.setPrototypeOf(this, WorkflowNotFoundError.prototype);
  }
}
