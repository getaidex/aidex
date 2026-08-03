import type { Workflow } from '../workflow/Workflow.js';
import type { WorkflowContext } from '../types/WorkflowContext.js';
import type { WorkflowEvent, WorkflowExecutionOptions } from '../types/WorkflowEvent.js';
import { WorkflowCancelledError } from './WorkflowCancelledError.js';

/**
 * Runs a Workflow's steps sequentially against one shared context instance.
 * Deliberately minimal: no retry, no parallelism, no branching, no
 * persistence, no logging. If a step throws, execution stops immediately —
 * the rejection propagates and no later step runs.
 *
 * Optional, backward-compatible extensions: an AbortSignal for cancellation
 * (checked before each step, and raced against an in-flight one), and an
 * onEvent callback for observability — both are opt-in via the third
 * `options` parameter and change nothing about calls that omit them.
 */
export class WorkflowExecutor {
  async execute<TState>(
    workflow: Workflow<TState>,
    context: WorkflowContext<TState>,
    options?: WorkflowExecutionOptions
  ): Promise<WorkflowContext<TState>> {
    const signal = options?.signal;
    const emit = (event: WorkflowEvent): void => options?.onEvent?.(event);

    emit({ type: 'workflow-started' });

    for (const step of workflow.getSteps()) {
      if (signal?.aborted) {
        const error = new WorkflowCancelledError(step.name);
        emit({ type: 'workflow-cancelled', stepName: step.name, error });
        throw error;
      }

      emit({ type: 'step-started', stepName: step.name });

      try {
        await this.raceAbort(step.execute(context), signal);
      } catch (error) {
        if (error instanceof WorkflowCancelledError) {
          emit({ type: 'workflow-cancelled', stepName: step.name, error });
        } else {
          emit({ type: 'step-failed', stepName: step.name, error });
        }
        throw error;
      }

      emit({ type: 'step-completed', stepName: step.name });
    }

    emit({ type: 'workflow-completed' });
    return context;
  }

  private raceAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) {
      return promise;
    }
    if (signal.aborted) {
      return Promise.reject(new WorkflowCancelledError());
    }

    return new Promise<T>((resolve, reject) => {
      const onAbort = (): void => reject(new WorkflowCancelledError());
      signal.addEventListener('abort', onAbort, { once: true });
      promise.then(
        (value) => {
          signal.removeEventListener('abort', onAbort);
          resolve(value);
        },
        (err: unknown) => {
          signal.removeEventListener('abort', onAbort);
          reject(err);
        }
      );
    });
  }
}
