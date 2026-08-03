/**
 * Thrown by WorkflowRegistry.register() when the same workflow id is
 * registered twice. Package-local rather than reusing @aidex/core's
 * DuplicateRegistrationError — @aidex/workflow deliberately has zero
 * dependency on @aidex/core, and this preserves that.
 */
export class WorkflowAlreadyRegisteredError extends Error {
  readonly workflowId: string;

  constructor(workflowId: string) {
    super(`Workflow already registered: "${workflowId}"`);
    this.name = 'WorkflowAlreadyRegisteredError';
    this.workflowId = workflowId;
    Object.setPrototypeOf(this, WorkflowAlreadyRegisteredError.prototype);
  }
}
