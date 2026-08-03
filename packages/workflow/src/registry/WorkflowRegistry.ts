import type { Workflow } from '../workflow/Workflow.js';
import type { WorkflowContext } from '../types/WorkflowContext.js';
import type { WorkflowExecutionOptions } from '../types/WorkflowEvent.js';
import { WorkflowExecutor } from '../executor/WorkflowExecutor.js';
import { WorkflowNotFoundError } from '../errors/WorkflowNotFoundError.js';
import { WorkflowAlreadyRegisteredError } from '../errors/WorkflowAlreadyRegisteredError.js';

/**
 * Central, id-keyed registry for Workflows — register once, dispatch by
 * id. Mirrors @aidex/engines' EngineRegistry pattern exactly, but does NOT
 * reuse @aidex/core's DuplicateRegistrationError: @aidex/workflow is
 * deliberately the one package in this platform with zero dependency on
 * @aidex/core, and this registry preserves that.
 */
export class WorkflowRegistry {
  private readonly workflows = new Map<string, Workflow>();

  register(workflow: Workflow): void {
    if (!workflow.id) {
      throw new Error('WorkflowRegistry.register() requires workflow.id to be set.');
    }
    if (this.workflows.has(workflow.id)) {
      throw new WorkflowAlreadyRegisteredError(workflow.id);
    }
    this.workflows.set(workflow.id, workflow);
  }

  unregister(id: string): boolean {
    return this.workflows.delete(id);
  }

  has(id: string): boolean {
    return this.workflows.has(id);
  }

  get(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  list(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  async execute<TState>(
    id: string,
    context: WorkflowContext<TState>,
    options?: WorkflowExecutionOptions
  ): Promise<WorkflowContext<TState>> {
    const workflow = this.workflows.get(id) as Workflow<TState> | undefined;
    if (!workflow) {
      throw new WorkflowNotFoundError(id);
    }

    return new WorkflowExecutor().execute(workflow, context, options);
  }
}
