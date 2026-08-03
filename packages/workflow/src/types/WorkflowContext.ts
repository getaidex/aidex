/**
 * Generic, provider- and application-independent execution state shared
 * across a Workflow's steps. Callers supply their own TState shape; a
 * WorkflowExecutor passes the exact same instance to every step, in order,
 * so steps typically communicate forward by mutating it in place.
 */
export type WorkflowContext<TState = Record<string, unknown>> = TState;
