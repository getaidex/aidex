import type { AidexConfig, ILogger, Metadata, Provider } from '@aidex/core';
import type { WorkflowContext, WorkflowExecutionOptions, WorkflowRegistry } from '@aidex/workflow';

/**
 * SDK-owned execution context injected into every workflow run under the
 * reserved `$aidex` key — gives workflow steps the same provider/config/
 * logger/metadata surface Engine's ExecutionContext already provides,
 * without @aidex/workflow's generic TState model changing at all. Frozen
 * before injection: steps may read it, never mutate it. Applications must
 * never define or overwrite a `$aidex` key in their own workflow state —
 * this property is reserved by the SDK.
 */
export interface AidexWorkflowContext {
  readonly provider: Provider;
  readonly config: AidexConfig;
  readonly logger?: ILogger;
  readonly metadata?: Metadata;
}

/**
 * Returned by AI.workflow(workflowId) — delegates execute() straight to
 * WorkflowRegistry.execute(), injecting the frozen $aidex context. Holds
 * no execution logic of its own: id lookup and step-running both happen
 * inside WorkflowRegistry/WorkflowExecutor, never duplicated here.
 */
export class WorkflowHandle<TState = Record<string, unknown>> {
  constructor(
    private readonly registry: WorkflowRegistry,
    private readonly config: AidexConfig,
    private readonly workflowId: string
  ) {}

  execute(
    input?: TState,
    options?: WorkflowExecutionOptions
  ): Promise<WorkflowContext<TState & { $aidex: AidexWorkflowContext }>> {
    const context = {
      ...input,
      $aidex: Object.freeze({
        provider: this.config.provider,
        config: this.config,
        logger: this.config.logger,
        metadata: this.config.metadata,
      }),
    } as TState & { $aidex: AidexWorkflowContext };

    return this.registry.execute(this.workflowId, context, options);
  }
}
