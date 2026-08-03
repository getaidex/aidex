import type { AidexRequest } from './AidexRequest.js';
import type { ExecutionContext } from './ExecutionContext.js';

export interface Strategy<TResult = unknown, TContext = unknown> {
  readonly name: string;
  readonly version?: string;
  execute(
    request: AidexRequest<TContext>,
    context: ExecutionContext<TContext>
  ): Promise<TResult>;
}
